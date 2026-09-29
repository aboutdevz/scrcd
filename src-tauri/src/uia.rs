use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UiaElementInfo {
    pub name: String,
    pub control_type: String,
    pub app_name: String,
    pub window_title: String,
    pub is_password: bool,
    pub generated_title: String,
}

#[cfg(windows)]
pub fn inspect_point(x: i32, y: i32, is_typing: bool) -> UiaElementInfo {
    use std::ffi::c_void;
    use windows::core::{BSTR, GUID};
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_MULTITHREADED,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationElement, UIA_ButtonControlTypeId,
        UIA_CheckBoxControlTypeId, UIA_ComboBoxControlTypeId, UIA_EditControlTypeId,
        UIA_HyperlinkControlTypeId, UIA_IsPasswordPropertyId, UIA_ListItemControlTypeId,
        UIA_MenuItemControlTypeId, UIA_RadioButtonControlTypeId, UIA_TabItemControlTypeId,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowTextW, GetWindowThreadProcessId, WindowFromPoint,
    };

    let mut info = UiaElementInfo {
        name: String::new(),
        control_type: "Element".to_string(),
        app_name: "Desktop".to_string(),
        window_title: String::new(),
        is_password: false,
        generated_title: String::new(),
    };

    let pt = POINT { x, y };

    unsafe {
        // Window & Process inspection
        let hwnd = WindowFromPoint(pt);
        if !hwnd.0.is_null() {
            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            if len > 0 {
                info.window_title = String::from_utf16_lossy(&title_buf[..len as usize]);
                info.app_name = info.window_title.clone();
            }
        }

        // COM UI Automation
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        if let Ok(automation) = CoCreateInstance::<_, IUIAutomation>(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
            if let Ok(element) = automation.ElementFromPoint(pt) {
                // Name
                if let Ok(bstr_name) = element.CurrentName() {
                    info.name = bstr_name.to_string();
                }

                // Control Type
                if let Ok(ctl_id) = element.CurrentControlType() {
                    info.control_type = match ctl_id {
                        id if id == UIA_ButtonControlTypeId => "Button".to_string(),
                        id if id == UIA_EditControlTypeId => "Input Field".to_string(),
                        id if id == UIA_MenuItemControlTypeId => "Menu Item".to_string(),
                        id if id == UIA_CheckBoxControlTypeId => "Checkbox".to_string(),
                        id if id == UIA_RadioButtonControlTypeId => "Radio Button".to_string(),
                        id if id == UIA_ComboBoxControlTypeId => "Dropdown".to_string(),
                        id if id == UIA_HyperlinkControlTypeId => "Link".to_string(),
                        id if id == UIA_ListItemControlTypeId => "List Item".to_string(),
                        id if id == UIA_TabItemControlTypeId => "Tab".to_string(),
                        _ => "Element".to_string(),
                    };
                }

                // Password flag
                if let Ok(is_pwd_prop) = element.GetCurrentPropertyValue(UIA_IsPasswordPropertyId) {
                    // Check if VARIANT boolean is true
                    if is_pwd_prop.Anonymous.Anonymous.vt == 11 /* VT_BOOL */ {
                        info.is_password = is_pwd_prop.Anonymous.Anonymous.Anonymous.boolVal.0 == -1;
                    }
                }
            }
        }

        CoUninitialize();
    }

    // Generate natural language title
    let target = if !info.name.trim().is_empty() {
        format!("'{}'", info.name.trim())
    } else {
        info.control_type.clone()
    };

    let app_part = if !info.app_name.trim().is_empty() {
        format!(" in {}", info.app_name.trim())
    } else {
        String::new()
    };

    info.generated_title = if is_typing {
        if info.is_password {
            format!("Enter password into {target}{app_part}")
        } else {
            format!("Type into {target}{app_part}")
        }
    } else {
        format!("Click {target}{app_part}")
    };

    info
}

#[cfg(not(windows))]
pub fn inspect_point(_x: i32, _y: i32, _is_typing: bool) -> UiaElementInfo {
    UiaElementInfo {
        name: "Mock Element".to_string(),
        control_type: "Button".to_string(),
        app_name: "Mock Application".to_string(),
        window_title: "Mock Window".to_string(),
        is_password: false,
        generated_title: "Click 'Mock Element' in Mock Application".to_string(),
    }
}
