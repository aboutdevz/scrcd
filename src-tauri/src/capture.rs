use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct CaptureResult {
    pub file_path: PathBuf,
    pub width: u32,
    pub height: u32,
    pub monitor_x: i32,
    pub monitor_y: i32,
}

#[cfg(windows)]
pub fn capture_screen_at_point(
    x: i32,
    y: i32,
    save_dir: &Path,
    filename: &str,
    quality: f32,
) -> Result<CaptureResult, String> {
    use image::{ColorType, ImageEncoder, RgbaImage};
    use std::fs::File;
    use std::io::BufWriter;
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, GetMonitorInfoW, MonitorFromPoint, ReleaseDC, SelectObject, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HBITMAP, HDC, MONITORINFO,
        MONITOR_DEFAULTTONEAREST, SRCCOPY,
    };

    let pt = POINT { x, y };

    unsafe {
        let hmon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut minfo = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            rcMonitor: RECT::default(),
            rcWork: RECT::default(),
            dwFlags: 0,
        };
        GetMonitorInfoW(hmon, &mut minfo);

        let mon_rect = minfo.rcMonitor;
        let width = (mon_rect.right - mon_rect.left) as i32;
        let height = (mon_rect.bottom - mon_rect.top) as i32;

        if width <= 0 || height <= 0 {
            return Err("Invalid monitor dimensions".to_string());
        }

        let hdc_screen: HDC = GetDC(HWND(std::ptr::null_mut()));
        let hdc_mem: HDC = CreateCompatibleDC(hdc_screen);
        let hbm: HBITMAP = CreateCompatibleBitmap(hdc_screen, width, height);
        let old_bm = SelectObject(hdc_mem, hbm);

        // Blit from screen to memory DC
        let _ = BitBlt(
            hdc_mem,
            0,
            0,
            width,
            height,
            hdc_screen,
            mon_rect.left,
            mon_rect.top,
            SRCCOPY,
        );

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD::default()],
        };

        let mut raw_pixels = vec![0u8; (width * height * 4) as usize];
        GetDIBits(
            hdc_mem,
            hbm,
            0,
            height as u32,
            Some(raw_pixels.as_mut_ptr() as *mut _),
            &mut bi,
            DIB_RGB_COLORS,
        );

        // Cleanup GDI objects
        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(HWND(std::ptr::null_mut()), hdc_screen);

        // Convert BGRA to RGBA
        for chunk in raw_pixels.chunks_exact_mut(4) {
            let b = chunk[0];
            let r = chunk[2];
            chunk[0] = r;
            chunk[2] = b;
            chunk[3] = 255;
        }

        std::fs::create_dir_all(save_dir)
            .map_err(|e| format!("Failed to create save dir: {}", e))?;
        let out_path = save_dir.join(filename);

        let img = RgbaImage::from_raw(width as u32, height as u32, raw_pixels)
            .ok_or_else(|| "Failed to construct RgbaImage from pixels".to_string())?;

        // Save image file
        img.save(&out_path)
            .map_err(|e| format!("Failed to save screenshot image: {}", e))?;

        Ok(CaptureResult {
            file_path: out_path,
            width: width as u32,
            height: height as u32,
            monitor_x: mon_rect.left,
            monitor_y: mon_rect.top,
        })
    }
}

#[cfg(not(windows))]
pub fn capture_screen_at_point(
    _x: i32,
    _y: i32,
    save_dir: &Path,
    filename: &str,
    _quality: f32,
) -> Result<CaptureResult, String> {
    let out_path = save_dir.join(filename);
    let _ = std::fs::create_dir_all(save_dir);
    let img = image::RgbaImage::new(1920, 1080);
    let _ = img.save(&out_path);
    Ok(CaptureResult {
        file_path: out_path,
        width: 1920,
        height: 1080,
        monitor_x: 0,
        monitor_y: 0,
    })
}
