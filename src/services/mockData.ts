// Utility to generate realistic desktop screenshots dynamically in browser mode
export function generateMockScreenshot(
  title: string,
  width = 1280,
  height = 720,
  clickX = 640,
  clickY = 360,
  theme: 'chrome' | 'vscode' | 'excel' | 'settings' = 'chrome'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0f172a'; // Slate-900 desktop
  ctx.fillRect(0, 0, width, height);

  // App Window Window Frame
  const winX = 40;
  const winY = 40;
  const winW = width - 80;
  const winH = height - 100;

  // Window Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 10;

  // Window Background
  ctx.fillStyle = theme === 'vscode' ? '#1e1e1e' : theme === 'excel' ? '#ffffff' : '#1e293b';
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Window Title Bar
  ctx.fillStyle = theme === 'vscode' ? '#323233' : theme === 'excel' ? '#107c41' : '#0f172a';
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, 40, [8, 8, 0, 0]);
  ctx.fill();

  // Window Title Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText(title, winX + 60, winY + 25);

  // Window Buttons (Close, Min, Max)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(winX + 20, winY + 20, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(winX + 36, winY + 20, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(winX + 52, winY + 20, 6, 0, Math.PI * 2);
  ctx.fill();

  // App Content Mockup
  if (theme === 'chrome') {
    // URL Bar
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(winX + 100, winY + 50, winW - 200, 34, 6);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('https://app.company.internal/settings/security', winX + 120, winY + 72);

    // Page Card Content
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(winX + 80, winY + 120, winW - 160, winH - 160, 8);
    ctx.fill();

    // Headings
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.fillText('Account Security & Privacy Settings', winX + 110, winY + 165);

    // Form elements
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(winX + 110, winY + 200, 320, 44);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Current Password', winX + 125, winY + 227);

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(winX + 110, winY + 270, 160, 42, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText('Save Changes', winX + 145, winY + 296);
  } else if (theme === 'vscode') {
    // Sidebar
    ctx.fillStyle = '#252526';
    ctx.fillRect(winX, winY + 40, 50, winH - 40);

    // File Tree
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(winX + 50, winY + 40, 200, winH - 40);
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('EXPLORER', winX + 65, winY + 65);
    ctx.fillText('📁 src', winX + 75, winY + 95);
    ctx.fillText('  📄 App.tsx', winX + 75, winY + 120);
    ctx.fillText('  📄 main.rs', winX + 75, winY + 145);

    // Code Editor
    ctx.fillStyle = '#569cd6';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('async fn main() -> Result<(), Box<dyn Error>> {', winX + 270, winY + 80);
    ctx.fillStyle = '#4ec9b0';
    ctx.fillText('    let app = App::new();', winX + 270, winY + 105);
    ctx.fillStyle = '#ce9178';
    ctx.fillText('    println!("Server running on port 8080");', winX + 270, winY + 130);
    ctx.fillStyle = '#569cd6';
    ctx.fillText('    Ok(())', winX + 270, winY + 155);
    ctx.fillText('}', winX + 270, winY + 180);
  }

  // Windows Taskbar at bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(0, height - 44, width, 44);

  // Start Icon & Pinned Apps
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(16, height - 32, 20, 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('10:45 AM  |  SCRCD Active', width - 160, height - 18);

  return canvas.toDataURL('image/webp', 0.85);
}
