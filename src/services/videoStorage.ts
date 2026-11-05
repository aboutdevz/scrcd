import { VideoChapter } from '@/types';
import { isElectron, getElectron } from '@/services/api';

const IDB_NAME = 'scrcd_videos_db';
const IDB_STORE = 'videos';
const IDB_VERSION = 1;

export function clampVideoTrim(
  trimStart: number,
  trimEnd: number,
  duration: number
): { trimStart: number; trimEnd: number } {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const minWindow = Math.min(0.5, safeDuration);

  let start = Number.isFinite(trimStart) ? Math.max(0, Math.min(safeDuration, trimStart)) : 0;
  let end = Number.isFinite(trimEnd) ? Math.max(0, Math.min(safeDuration, trimEnd)) : safeDuration;

  if (start >= end) {
    start = Math.max(0, end - minWindow);
    if (start >= end) {
      start = 0;
      end = safeDuration;
    }
  } else if (end - start < minWindow) {
    if (start + minWindow <= safeDuration) {
      end = start + minWindow;
    } else {
      start = Math.max(0, safeDuration - minWindow);
      end = safeDuration;
    }
  }

  return {
    trimStart: Math.round(start * 100) / 100,
    trimEnd: Math.round(end * 100) / 100,
  };
}

export function normalizeVideoChapters(
  chapters: VideoChapter[],
  duration?: number
): VideoChapter[] {
  if (!Array.isArray(chapters)) return [];
  const maxDur = typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : undefined;
  return chapters
    .map((ch) => {
      let ts = Number.isFinite(ch.timestamp) ? Math.max(0, ch.timestamp) : 0;
      if (maxDur !== undefined) {
        ts = Math.min(maxDur, ts);
      }
      return {
        ...ch,
        timestamp: Math.round(ts * 10) / 10,
        title: (ch.title || 'Chapter').trim() || 'Chapter',
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function formatVideoTimestamp(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function openVideosIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideoToStorage(projectId: string, blob: Blob): Promise<string> {
  if (isElectron()) {
    const electron = getElectron();
    if (electron && electron.ipcRenderer) {
      try {
        const arrayBuf = await blob.arrayBuffer();
        const res = await electron.ipcRenderer.invoke('save-video-file', {
          projectId,
          buffer: new Uint8Array(arrayBuf),
        });
        if (res && res.success && res.videoPath) {
          return res.videoPath;
        }
      } catch (err) {
        console.warn('Electron save-video-file failed, falling back to IndexedDB:', err);
      }
    }
  }

  try {
    const db = await openVideosIdb();
    const key = `video_${projectId}`;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return `idb://${key}`;
  } catch {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      return URL.createObjectURL(blob);
    }
    return '';
  }
}

export async function resolveVideoUrl(videoPath?: string): Promise<string | null> {
  if (!videoPath) return null;
  if (videoPath.startsWith('idb://')) {
    const key = videoPath.slice('idb://'.length);
    try {
      const db = await openVideosIdb();
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (blob && typeof URL !== 'undefined' && URL.createObjectURL) {
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('Failed to resolve video from IndexedDB:', err);
    }
    return null;
  }
  return videoPath;
}

export async function deleteVideoFromStorage(projectId: string, videoPath?: string): Promise<void> {
  if (isElectron() && videoPath && videoPath.startsWith('file://')) {
    const electron = getElectron();
    if (electron && electron.ipcRenderer) {
      try {
        await electron.ipcRenderer.invoke('delete-video-file', { videoPath });
      } catch {}
    }
  }

  try {
    const db = await openVideosIdb();
    const key = videoPath && videoPath.startsWith('idb://') ? videoPath.slice('idb://'.length) : `video_${projectId}`;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {}
}
