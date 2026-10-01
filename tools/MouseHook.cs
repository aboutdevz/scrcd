using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.Runtime.InteropServices;

public class Program
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int VK_RETURN = 0x0D;

    private const uint EVENT_SYSTEM_FOREGROUND = 0x0003;
    private const uint WINEVENT_OUTOFCONTEXT = 0;

    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);
    private delegate void WinEventDelegate(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime);

    private static LowLevelMouseProc _mouseProc = MouseHookCallback;
    private static WinEventDelegate _winEventProc = WinEventCallback;

    private static IntPtr _mouseHookID = IntPtr.Zero;
    private static IntPtr _winEventHookID = IntPtr.Zero;
    private static volatile bool _running = true;

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT
    {
        public POINT pt;
        public uint mouseData;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hmodWinEventProc, WinEventDelegate lpfnWinEventProc, uint idProcess, uint idThread, uint dwFlags);

    [DllImport("user32.dll")]
    private static extern bool UnhookWinEvent(IntPtr hWinEventHook);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    private static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage([In] ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage([In] ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern bool SetProcessDPIAware();

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }

    private static string EscapeJson(string s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        StringBuilder sb = new StringBuilder();
        foreach (char c in s)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '\"': sb.Append("\\\""); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < 32)
                    {
                        sb.AppendFormat("\\u{0:x4}", (int)c);
                    }
                    else
                    {
                        sb.Append(c);
                    }
                    break;
            }
        }
        return sb.ToString();
    }

    public static void Main()
    {
        try
        {
            Stream stdout = Console.OpenStandardOutput();
            StreamWriter writer = new StreamWriter(stdout, new UTF8Encoding(false));
            writer.AutoFlush = true;
            Console.SetOut(writer);
        }
        catch {}

        SetProcessDPIAware();

        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            IntPtr moduleHandle = GetModuleHandle(curModule.ModuleName);
            _mouseHookID = SetWindowsHookEx(WH_MOUSE_LL, _mouseProc, moduleHandle, 0);
        }

        _winEventHookID = SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, IntPtr.Zero, _winEventProc, 0, 0, WINEVENT_OUTOFCONTEXT);

        Thread enterKeyThread = new Thread(MonitorEnterKey);
        enterKeyThread.IsBackground = true;
        enterKeyThread.Start();

        // Keep running until process is terminated
        MSG msg;
        while (GetMessage(out msg, IntPtr.Zero, 0, 0) > 0)
        {
            TranslateMessage(ref msg);
            DispatchMessage(ref msg);
        }

        _running = false;
        if (_mouseHookID != IntPtr.Zero) UnhookWindowsHookEx(_mouseHookID);
        if (_winEventHookID != IntPtr.Zero) UnhookWinEvent(_winEventHookID);
    }

    private static void MonitorEnterKey()
    {
        bool wasDown = false;
        while (_running)
        {
            try
            {
                short state = GetAsyncKeyState(VK_RETURN);
                bool isDown = (state & 0x8000) != 0;
                if (isDown && !wasDown)
                {
                    POINT pt;
                    GetCursorPos(out pt);
                    Console.WriteLine(string.Format("{{\"type\":\"keypress\",\"key\":\"Enter\",\"x\":{0},\"y\":{1}}}", pt.x, pt.y));
                    Console.Out.Flush();
                }
                wasDown = isDown;
            }
            catch {}
            Thread.Sleep(35);
        }
    }

    private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && wParam == (IntPtr)WM_LBUTTONDOWN)
        {
            MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
            Console.WriteLine(string.Format("{{\"type\":\"click\",\"button\":1,\"x\":{0},\"y\":{1}}}", hookStruct.pt.x, hookStruct.pt.y));
            Console.Out.Flush();
        }
        return CallNextHookEx(_mouseHookID, nCode, wParam, lParam);
    }

    private static void WinEventCallback(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime)
    {
        if (eventType == EVENT_SYSTEM_FOREGROUND && hwnd != IntPtr.Zero)
        {
            StringBuilder sb = new StringBuilder(512);
            if (GetWindowText(hwnd, sb, 512) > 0)
            {
                string title = sb.ToString().Trim();
                if (!string.IsNullOrEmpty(title))
                {
                    string escaped = EscapeJson(title);
                    Console.WriteLine(string.Format("{{\"type\":\"window_focus\",\"windowTitle\":\"{0}\",\"hwnd\":{1}}}", escaped, hwnd.ToInt64()));
                    Console.Out.Flush();
                }
            }
        }
    }
}
