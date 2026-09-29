use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputEventType {
    LeftClick,
    RightClick,
    DoubleClick,
    KeyPress { key_name: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookEvent {
    pub event_type: InputEventType,
    pub x: i32,
    pub y: i32,
    pub timestamp: u64,
}

pub type EventCallback = Arc<dyn Fn(HookEvent) + Send + Sync + 'static>;

static IS_RECORDING: AtomicBool = AtomicBool::new(false);
static CALLBACK: Mutex<Option<EventCallback>> = Mutex::new(None);
static LAST_CLICK: Mutex<Option<(i32, i32, Instant)>> = Mutex::new(None);

pub fn set_recording(enabled: bool, cb: Option<EventCallback>) {
    IS_RECORDING.store(enabled, Ordering::SeqCst);
    let mut g = CALLBACK.lock().unwrap();
    *g = cb;
}

pub fn is_recording() -> bool {
    IS_RECORDING.load(Ordering::SeqCst)
}

#[cfg(windows)]
pub fn start_hook_thread() {
    use std::thread;
    use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, POINT, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetCursorPos, GetMessageW, SetWindowsHookExW,
        UnhookWindowsHookEx, HHOOK, MSG, MSLLHOOKSTRUCT, WH_MOUSE_LL, WM_LBUTTONDBLCLK,
        WM_LBUTTONDOWN, WM_RBUTTONDOWN,
    };

    thread::spawn(|| unsafe {
        unsafe extern "system" fn mouse_proc(
            code: i32,
            wparam: WPARAM,
            lparam: LPARAM,
        ) -> LRESULT {
            if code >= 0 && IS_RECORDING.load(Ordering::Relaxed) {
                let msg = wparam.0 as u32;
                if msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN || msg == WM_LBUTTONDBLCLK {
                    let hook_struct = *(lparam.0 as *const MSLLHOOKSTRUCT);
                    let x = hook_struct.pt.x;
                    let y = hook_struct.pt.y;

                    // Debounce check: ignore clicks within 300ms on identical coordinates
                    let mut should_trigger = true;
                    let now = Instant::now();
                    {
                        let mut last = LAST_CLICK.lock().unwrap();
                        if let Some((lx, ly, ltime)) = *last {
                            if lx == x && ly == y && now.duration_since(ltime).as_millis() < 300 {
                                should_trigger = false;
                            }
                        }
                        if should_trigger {
                            *last = Some((x, y, now));
                        }
                    }

                    if should_trigger {
                        let ev_type = if msg == WM_RBUTTONDOWN {
                            InputEventType::RightClick
                        } else if msg == WM_LBUTTONDBLCLK {
                            InputEventType::DoubleClick
                        } else {
                            InputEventType::LeftClick
                        };

                        let ev = HookEvent {
                            event_type: ev_type,
                            x,
                            y,
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64,
                        };

                        let cb_guard = CALLBACK.lock().unwrap();
                        if let Some(cb) = cb_guard.as_ref() {
                            cb(ev);
                        }
                    }
                }
            }
            CallNextHookEx(HHOOK(std::ptr::null_mut()), code, wparam, lparam)
        }

        let hook: HHOOK = SetWindowsHookExW(
            WH_MOUSE_LL,
            Some(mouse_proc),
            HINSTANCE(std::ptr::null_mut()),
            0,
        )
        .expect("Failed to install mouse hook");

        let mut msg: MSG = MSG::default();
        while GetMessageW(&mut msg, HWND(std::ptr::null_mut()), 0, 0).as_bool() {
            let _ = DispatchMessageW(&msg);
        }

        let _ = UnhookWindowsHookEx(hook);
    });
}

#[cfg(not(windows))]
pub fn start_hook_thread() {
    // Non-windows stub
}
