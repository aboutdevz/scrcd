use tauri::WebviewWindow;

#[cfg(windows)]
pub fn exclude_window_from_capture(window: &WebviewWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WINDOW_DISPLAY_AFFINITY};

    if let Ok(raw_hwnd) = window.hwnd() {
        let hwnd = HWND(raw_hwnd.0 as _);
        unsafe {
            // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (17)
            let affinity = WINDOW_DISPLAY_AFFINITY(17);
            let result = SetWindowDisplayAffinity(hwnd, affinity);
            if !result.as_bool() {
                return Err("Failed to set WDA_EXCLUDEFROMCAPTURE".to_string());
            }
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn exclude_window_from_capture(_window: &WebviewWindow) -> Result<(), String> {
    Ok(())
}
