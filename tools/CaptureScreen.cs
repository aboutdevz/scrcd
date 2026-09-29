using System;
using System.IO;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class Program
{
    [DllImport("user32.dll")]
    private static extern bool SetProcessDPIAware();

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);

    private const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromPoint(POINT pt, uint dwFlags);

    private const uint MONITOR_DEFAULTTONEAREST = 2;

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll")]
    private static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll")]
    private static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int smIndex);

    private const int SM_XVIRTUALSCREEN = 76;
    private const int SM_YVIRTUALSCREEN = 77;
    private const int SM_CXVIRTUALSCREEN = 78;
    private const int SM_CYVIRTUALSCREEN = 79;
    private const int SRCCOPY = 0x00CC0020;
    private const int CAPTUREBLT = 0x40000000;

    // Args:
    // args[0] = outputPath
    // args[1] = mode: "window" | "cursor" | "monitor" | "all"
    // args[2] = clickX (optional)
    // args[3] = clickY (optional)
    // args[4..7] = optional explicit bounds: X Y W H
    public static int Main(string[] args)
    {
        try
        {
            SetProcessDPIAware();

            string outputPath = args.Length > 0 ? args[0] : "screenshot.png";
            string mode = args.Length > 1 ? args[1].ToLower() : "window";

            int clickX = 0;
            int clickY = 0;
            if (args.Length > 3)
            {
                int.TryParse(args[2], out clickX);
                int.TryParse(args[3], out clickY);
            }

            // 1. Get Foreground Window & Title
            string windowTitle = "Desktop";
            IntPtr fgHwnd = GetForegroundWindow();
            RECT winRect = new RECT();
            bool hasValidWinRect = false;

            if (fgHwnd != IntPtr.Zero)
            {
                StringBuilder sb = new StringBuilder(512);
                if (GetWindowText(fgHwnd, sb, 512) > 0)
                {
                    windowTitle = sb.ToString().Trim();
                }

                // Try DwmGetWindowAttribute for accurate borderless bounds
                if (DwmGetWindowAttribute(fgHwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out winRect, Marshal.SizeOf(typeof(RECT))) == 0)
                {
                    hasValidWinRect = (winRect.Right - winRect.Left > 150) && (winRect.Bottom - winRect.Top > 100);
                }
                if (!hasValidWinRect && GetWindowRect(fgHwnd, out winRect))
                {
                    hasValidWinRect = (winRect.Right - winRect.Left > 150) && (winRect.Bottom - winRect.Top > 100);
                }
            }

            // 2. Determine Monitor Bounds for the Click
            POINT pt = new POINT { x = clickX, y = clickY };
            IntPtr hMonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
            MONITORINFO mi = new MONITORINFO();
            mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
            bool hasMonitor = GetMonitorInfo(hMonitor, ref mi);

            RECT monRect = hasMonitor ? mi.rcMonitor : new RECT { Left = 0, Top = 0, Right = 1920, Bottom = 1080 };
            int monW = monRect.Right - monRect.Left;
            int monH = monRect.Bottom - monRect.Top;

            // 3. Determine Capture Bounding Box (cropX, cropY, cropW, cropH)
            int cropX = 0;
            int cropY = 0;
            int cropW = 1920;
            int cropH = 1080;

            if (mode == "window" && hasValidWinRect)
            {
                // Capture only the active window rectangle!
                cropX = winRect.Left;
                cropY = winRect.Top;
                cropW = winRect.Right - winRect.Left;
                cropH = winRect.Bottom - winRect.Top;
            }
            else if (mode == "cursor")
            {
                // Smart focus: Area near the cursor (e.g. 1280x750 or 1000x650)
                int focusW = Math.Min(1200, monW);
                int focusH = Math.Min(750, monH);

                cropX = clickX - (focusW / 2);
                cropY = clickY - (focusH / 2);

                // Clamp to monitor boundaries
                if (cropX < monRect.Left) cropX = monRect.Left;
                if (cropY < monRect.Top) cropY = monRect.Top;
                if (cropX + focusW > monRect.Right) cropX = monRect.Right - focusW;
                if (cropY + focusH > monRect.Bottom) cropY = monRect.Bottom - focusH;

                cropW = focusW;
                cropH = focusH;
            }
            else if (mode == "monitor")
            {
                // Capture the single monitor containing the click (or explicit monitor bounds if given)
                if (args.Length >= 8)
                {
                    int.TryParse(args[4], out cropX);
                    int.TryParse(args[5], out cropY);
                    int.TryParse(args[6], out cropW);
                    int.TryParse(args[7], out cropH);
                }
                else
                {
                    cropX = monRect.Left;
                    cropY = monRect.Top;
                    cropW = monW;
                    cropH = monH;
                }
            }
            else if (mode == "all")
            {
                // All monitors virtual screen
                cropX = GetSystemMetrics(SM_XVIRTUALSCREEN);
                cropY = GetSystemMetrics(SM_YVIRTUALSCREEN);
                cropW = GetSystemMetrics(SM_CXVIRTUALSCREEN);
                cropH = GetSystemMetrics(SM_CYVIRTUALSCREEN);
            }
            else
            {
                // Default fallback: Single monitor where click happened (never stretch across multi-monitors!)
                cropX = monRect.Left;
                cropY = monRect.Top;
                cropW = monW;
                cropH = monH;
            }

            // Safety sanity checks
            if (cropW <= 0) cropW = 1920;
            if (cropH <= 0) cropH = 1080;

            // 4. BitBlt Screen DC to Memory DC
            IntPtr hdcScreen = GetDC(IntPtr.Zero);
            IntPtr hdcMem = CreateCompatibleDC(hdcScreen);
            IntPtr hBitmap = CreateCompatibleBitmap(hdcScreen, cropW, cropH);
            IntPtr hOld = SelectObject(hdcMem, hBitmap);

            BitBlt(hdcMem, 0, 0, cropW, cropH, hdcScreen, cropX, cropY, SRCCOPY | CAPTUREBLT);

            SelectObject(hdcMem, hOld);
            DeleteDC(hdcMem);
            ReleaseDC(IntPtr.Zero, hdcScreen);

            // 5. Save to disk
            using (Bitmap bmp = Image.FromHbitmap(hBitmap))
            {
                string dir = Path.GetDirectoryName(outputPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                bmp.Save(outputPath, ImageFormat.Png);
            }

            DeleteObject(hBitmap);

            string escapedTitle = windowTitle.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");

            Console.WriteLine(string.Format("{{\"success\":true,\"width\":{0},\"height\":{1},\"left\":{2},\"top\":{3},\"windowTitle\":\"{4}\",\"path\":\"{5}\"}}",
                cropW, cropH, cropX, cropY, escapedTitle, outputPath.Replace("\\", "/")));

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine(string.Format("{{\"success\":false,\"error\":\"{0}\"}}", ex.Message.Replace("\"", "\\\"")));
            return 1;
        }
    }
}
