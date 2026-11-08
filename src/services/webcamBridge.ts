import { isElectron, getElectron } from '@/services/api';

let broadcasterPC: RTCPeerConnection | null = null;
let currentBroadcastStream: MediaStream | null = null;

export function broadcastWebcamStream(stream: MediaStream): void {
  currentBroadcastStream = stream;
  if (!isElectron()) return;
  const electron = getElectron();
  if (!electron?.ipcRenderer) return;

  if (broadcasterPC) {
    try {
      broadcasterPC.close();
    } catch {}
    broadcasterPC = null;
  }

  const setupPeer = async () => {
    try {
      const pc = new RTCPeerConnection();
      broadcasterPC = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && isElectron()) {
          const el = getElectron();
          el?.ipcRenderer?.send('webcam-bridge-candidate', {
            target: 'webcam',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      electron.ipcRenderer.send('webcam-bridge-offer', {
        sdp: offer.sdp,
        type: offer.type,
      });
    } catch (err) {
      console.warn('Failed to initialize webcam bridge broadcaster:', err);
    }
  };

  setupPeer();

  const handleAnswer = async (_e: any, answer: any) => {
    try {
      if (broadcasterPC && broadcasterPC.signalingState !== 'closed') {
        await broadcasterPC.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.warn('Failed to set remote description on webcam broadcaster:', err);
    }
  };

  const handleCandidate = async (_e: any, candidate: any) => {
    try {
      if (broadcasterPC && broadcasterPC.remoteDescription) {
        await broadcasterPC.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch {}
  };

  const handleReady = () => {
    if (currentBroadcastStream) {
      setupPeer();
    }
  };

  electron.ipcRenderer.removeAllListeners('webcam-bridge-answer');
  electron.ipcRenderer.removeAllListeners('webcam-bridge-candidate-to-main');
  electron.ipcRenderer.removeAllListeners('webcam-window-ready');

  electron.ipcRenderer.on('webcam-bridge-answer', handleAnswer);
  electron.ipcRenderer.on('webcam-bridge-candidate-to-main', handleCandidate);
  electron.ipcRenderer.on('webcam-window-ready', handleReady);
}

export function stopWebcamBroadcast(): void {
  currentBroadcastStream = null;
  if (broadcasterPC) {
    try {
      broadcasterPC.close();
    } catch {}
    broadcasterPC = null;
  }
}
