const { app, BrowserWindow, ipcMain, screen, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

// Force Windows taskbar grouping to use SCRCD's identity and custom icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.scrcd.app');
}

// Memory & Resource Footprint Optimizations
app.commandLine.appendSwitch('disable-features', 'SpareRendererForSitePerProcess,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');

let mainWindow = null;
let pillWindow = null;

let isRecording = false;
let isRecordingPaused = false;
let isBusyCapturing = false;
let lastCaptureTime = 0;
let currentProjectId = null;
let recordedSteps = [];
let hookProcess = null;

function getAppIcon() {
  const candidates = [
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '../public/favicon.ico'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath || '', 'public/favicon.ico'),
    path.join(process.resourcesPath || '', 'electron/icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(process.cwd(), 'public/favicon.ico'),
    path.join(process.cwd(), 'electron/icon.ico'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const img = nativeImage.createFromPath(c);
        if (!img.isEmpty()) return img;
      } catch (e) {}
      return c;
    }
  }
  return path.join(__dirname, 'icon.ico');
}

function getBinaryPath(filename) {
  const possiblePaths = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'bin', filename),
    path.join(__dirname, '../bin', filename),
    path.join(__dirname, 'bin', filename),
    path.join(process.cwd(), 'bin', filename),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '../bin', filename);
}

function createMainWindow() {
  const appIcon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SCRCD - Step-by-Step SOP & Guide Creator',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  if (typeof appIcon !== 'string' && mainWindow.setIcon) {
    try {
      mainWindow.setIcon(appIcon);
    } catch (e) {}
  }

  const distPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath).catch((err) => {
      console.error('Error loading dist/index.html:', err);
    });
  } else {
    mainWindow.loadURL('http://localhost:1420');
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`Page failed to load [${code}]: ${desc}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopRecordingSession();
  });
}

function createPillWindow() {
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.show();
    pillWindow.setAlwaysOnTop(true, 'screen-saver');
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const pillWidth = 320;
  const pillHeight = 52;

  pillWindow = new BrowserWindow({
    width: pillWidth,
    height: pillHeight,
    x: width - pillWidth - 24,
    y: height - pillHeight - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  // Exclude floating pill from screen capture
  pillWindow.setContentProtection(true);

  const distPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distPath)) {
    pillWindow.loadFile(distPath, { hash: 'pill' });
  } else {
    pillWindow.loadURL('http://localhost:1420/#pill');
  }

  pillWindow.once('ready-to-show', () => {
    pillWindow.show();
    pillWindow.setAlwaysOnTop(true, 'screen-saver');
    pillWindow.webContents.send('pill-step-count', recordedSteps.length);
  });

  pillWindow.on('closed', () => {
    pillWindow = null;
  });
}

function stopRecordingSession() {
  isRecording = false;
  isRecordingPaused = false;
  if (hookProcess) {
    try {
      hookProcess.kill();
    } catch (e) {}
    hookProcess = null;
  }
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.close();
    pillWindow = null;
  }
}

let currentCaptureConfig = { scope: 'window', hotspotVariant: 'spotlight' };

let startingStepOffset = 0;

async function captureStep(clickX, clickY, isSingleShot = false, overrideProjectId = null, overrideStepNumber = null) {
  if (isBusyCapturing) return null;
  if (!isSingleShot && (isRecordingPaused || !isRecording)) return null;

  const now = Date.now();
  if (!isSingleShot && now - lastCaptureTime < 350) return null; // 350ms click debounce
  lastCaptureTime = now;
  isBusyCapturing = true;

  try {
    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const shotFile = path.join(screenshotsDir, `shot_${now}.png`);
    const exePath = getBinaryPath('capture.exe');

    const captureMode = currentCaptureConfig.scope || 'window';
    const captureArgs = [shotFile, captureMode, clickX.toString(), clickY.toString()];
    if (currentCaptureConfig.monitorBounds) {
      const b = currentCaptureConfig.monitorBounds;
      captureArgs.push(b.x.toString(), b.y.toString(), b.width.toString(), b.height.toString());
    }

    const capResult = await new Promise((resolve) => {
      execFile(exePath, captureArgs, (err, stdout) => {
        if (err) {
          console.error('Capture exe error:', err);
          return resolve({ success: false });
        }
        try {
          const res = JSON.parse(stdout.trim());
          resolve(res);
        } catch (e) {
          resolve({ success: true, windowTitle: 'Application', width: 1920, height: 1080, left: 0, top: 0 });
        }
      });
    });

    if (fs.existsSync(shotFile)) {
      const imageUri = 'file:///' + shotFile.replace(/\\/g, '/');
      const relX = Math.max(0, clickX - (capResult.left || 0));
      const relY = Math.max(0, clickY - (capResult.top || 0));
      const appTitle = capResult.windowTitle || 'Application';

      const stepNumber = overrideStepNumber || (startingStepOffset + recordedSteps.length + 1);
      const isSpotlight = (currentCaptureConfig.hotspotVariant || 'spotlight') === 'spotlight';

      const step = {
        id: `step_${now}`,
        projectId: overrideProjectId || currentProjectId,
        stepNumber: stepNumber,
        title: isSingleShot ? `Snapshot in ${appTitle}` : `Click in ${appTitle}`,
        richInstructions: isSingleShot
          ? `<p>Screen snapshot captured for <strong>${appTitle}</strong>.</p>`
          : `<p>Click on the target element in <strong>${appTitle}</strong> to proceed.</p>`,
        actionType: isSingleShot ? 'snapshot' : 'click',
        screenshotPath: imageUri,
        originalWidth: capResult.width || 1920,
        originalHeight: capResult.height || 1080,
        clickX: relX,
        clickY: relY,
        uiaName: appTitle,
        uiaControlType: isSingleShot ? 'Window' : 'Element',
        uiaAppName: appTitle,
        annotations: isSingleShot
          ? []
          : [
              {
                id: `h_${now}`,
                type: 'hotspot',
                x: relX,
                y: relY,
                number: stepNumber,
                color: isSpotlight ? '#f59e0b' : '#2563eb',
                variant: isSpotlight ? 'spotlight' : 'badge',
                radius: 34,
              },
            ],
        isPassword: false,
        createdAt: now,
      };

      if (!isSingleShot) {
        recordedSteps.push(step);
        if (pillWindow && !pillWindow.isDestroyed()) {
          pillWindow.webContents.send('pill-step-count', startingStepOffset + recordedSteps.length);
        }
      }

      return step;
    }
  } catch (err) {
    console.error('Error during step capture:', err);
    return null;
  } finally {
    isBusyCapturing = false;
  }
  return null;
}

function startGlobalHook() {
  if (hookProcess) {
    try {
      hookProcess.kill();
    } catch (e) {}
    hookProcess = null;
  }

  const hookExe = getBinaryPath('hook.exe');
  if (!fs.existsSync(hookExe)) {
    console.error('hook.exe not found at:', hookExe);
    return;
  }

  try {
    hookProcess = spawn(hookExe, [], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });

    let buffer = '';
    hookProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const evt = JSON.parse(trimmed);
          if (evt.type === 'click') {
            // Check if click was inside floating pill window bounds
            if (pillWindow && !pillWindow.isDestroyed()) {
              const bounds = pillWindow.getBounds();
              if (
                evt.x >= bounds.x &&
                evt.x <= bounds.x + bounds.width &&
                evt.y >= bounds.y &&
                evt.y <= bounds.y + bounds.height
              ) {
                continue;
              }
            }
            captureStep(evt.x, evt.y);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });

    hookProcess.on('exit', () => {
      hookProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn hook.exe:', err);
  }
}

// IPC Handlers
ipcMain.handle('get-capture-sources', async () => {
  const displays = screen.getAllDisplays().map((d, index) => {
    const isPrimary = d.id === screen.getPrimaryDisplay().id;
    return {
      id: d.id,
      index: index + 1,
      isPrimary,
      bounds: d.bounds,
      label: `Monitor ${index + 1} (${d.bounds.width}×${d.bounds.height})${isPrimary ? ' - Primary' : ''}`,
    };
  });
  return {
    displays,
    isMultiMonitor: displays.length > 1,
  };
});

ipcMain.handle('start-recording', async (_event, { projectId, config }) => {
  currentProjectId = projectId;
  currentCaptureConfig = config || { scope: 'window', hotspotVariant: 'spotlight' };
  startingStepOffset = (config && config.existingStepsCount) ? Number(config.existingStepsCount) : 0;
  recordedSteps = [];
  isRecordingPaused = false;
  isRecording = true;

  // Minimize main window so user sees their desktop/apps
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }

  // Create real OS-level floating pill window
  createPillWindow();

  // Start global mouse hook process
  startGlobalHook();

  return { success: true };
});

ipcMain.handle('pause-recording', async () => {
  isRecordingPaused = !isRecordingPaused;
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.webContents.send('pill-pause-state', isRecordingPaused);
  }
  return isRecordingPaused;
});

ipcMain.handle('manual-snapshot', async (_event, params = {}) => {
  const mousePoint = screen.getCursorScreenPoint();
  const projId = params.projectId || currentProjectId;
  const stepNum = params.stepNumber;

  if (isRecording) {
    const step = await captureStep(mousePoint.x, mousePoint.y, false);
    return step;
  } else {
    // When idle/stopped: minimize main window, take clean snapshot, restore window, return step
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
    await new Promise((r) => setTimeout(r, 280));
    const currentMouse = screen.getCursorScreenPoint();
    const step = await captureStep(currentMouse.x, currentMouse.y, true, projId, stepNum);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    return step;
  }
});

ipcMain.handle('finish-recording', async () => {
  const stepsToReturn = [...recordedSteps];
  const finishedProjectId = currentProjectId;

  stopRecordingSession();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('recording-finished', {
      projectId: finishedProjectId,
      steps: stepsToReturn,
    });
  }

  return { success: true, count: stepsToReturn.length };
});

ipcMain.handle('cancel-recording', async () => {
  stopRecordingSession();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('recording-cancelled');
  }

  return { success: true };
});

ipcMain.handle('export-pdf', async (_event, { htmlContent, defaultFilename }) => {
  try {
    const rawName = defaultFilename || 'guide';
    const sanitized = rawName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow || undefined, {
      title: 'Save SOP Guide as PDF',
      defaultPath: path.join(app.getPath('documents'), sanitized),
      filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    // Create a hidden offscreen window to render the HTML document
    const printWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,
        spellcheck: false,
        backgroundThrottling: false,
      },
    });

    const tempHtmlPath = path.join(app.getPath('temp'), `scrcd_export_${Date.now()}.html`);
    await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf8');

    let pdfBuffer;
    try {
      await printWin.loadFile(tempHtmlPath);

      // Give DOM and all images time to decode and settle
      await printWin.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const images = Array.from(document.images);
          if (images.length === 0) return resolve();
          Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })))
            .then(() => setTimeout(resolve, 350));
        });
      `);

      pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'printableArea',
        },
        preferCSSPageSize: true,
      });
    } finally {
      printWin.close();
      fs.promises.unlink(tempHtmlPath).catch(() => {});
    }

    await fs.promises.writeFile(filePath, pdfBuffer);
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to export PDF via printToPDF:', err);
    return { success: false, error: err.message || String(err) };
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  stopRecordingSession();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
