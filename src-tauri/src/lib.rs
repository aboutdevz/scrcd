pub mod capture;
pub mod db;
pub mod hooks;
pub mod pill;
pub mod uia;

use db::{Database, ProjectRecord, StepRecord};
use hooks::HookEvent;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct AppState {
    pub db: Arc<Database>,
    pub current_project_id: Mutex<Option<String>>,
    pub app_data_dir: PathBuf,
}

#[tauri::command]
pub fn start_recording(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    {
        let mut cur = state.current_project_id.lock().unwrap();
        *cur = Some(project_id.clone());
    }

    let app_handle = app.clone();
    let db = state.db.clone();
    let app_dir = state.app_data_dir.clone();
    let pid = project_id.clone();

    // Show floating pill window and hide main window
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }
    if let Some(pill_win) = app.get_webview_window("recorder-pill") {
        let _ = pill::exclude_window_from_capture(&pill_win);
        let _ = pill_win.show();
    }

    hooks::set_recording(
        true,
        Some(Arc::new(move |event: HookEvent| {
            let step_id = format!("step_{}", event.timestamp);
            let filename = format!("{}.webp", step_id);
            let screenshots_dir = app_dir.join("projects").join(&pid).join("screenshots");

            // Perform display capture
            if let Ok(cap) =
                capture::capture_screen_at_point(event.x, event.y, &screenshots_dir, &filename, 0.85)
            {
                // Inspect UIA element
                let uia_info = uia::inspect_point(event.x, event.y, false);

                let rel_x = event.x - cap.monitor_x;
                let rel_y = event.y - cap.monitor_y;

                let step = StepRecord {
                    id: step_id,
                    project_id: pid.clone(),
                    section_id: None,
                    step_number: 1, // updated dynamically
                    title: uia_info.generated_title.clone(),
                    rich_instructions: format!("<p>{}</p>", uia_info.generated_title),
                    action_type: format!("{:?}", event.event_type).to_lowercase(),
                    screenshot_path: cap.file_path.to_string_lossy().to_string(),
                    original_width: cap.width as i32,
                    original_height: cap.height as i32,
                    click_x: rel_x,
                    click_y: rel_y,
                    uia_name: uia_info.name,
                    uia_control_type: uia_info.control_type,
                    uia_app_name: uia_info.app_name,
                    annotations_json: "[]".to_string(),
                    is_password: uia_info.is_password,
                    created_at: event.timestamp as i64,
                };

                let _ = db.insert_step(&step);

                // Notify frontend
                let _ = app_handle.emit("step-captured", step);
            }
        })),
    );

    Ok(())
}

#[tauri::command]
pub fn stop_recording(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    hooks::set_recording(false, None);

    {
        let mut cur = state.current_project_id.lock().unwrap();
        *cur = None;
    }

    if let Some(pill_win) = app.get_webview_window("recorder-pill") {
        let _ = pill_win.hide();
    }
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }

    Ok(())
}

#[tauri::command]
pub fn manual_snapshot(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: String,
) -> Result<StepRecord, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let step_id = format!("step_{}", now);
    let filename = format!("{}.webp", step_id);
    let screenshots_dir = state
        .app_data_dir
        .join("projects")
        .join(&project_id)
        .join("screenshots");

    // Capture at primary origin (0, 0)
    let cap = capture::capture_screen_at_point(0, 0, &screenshots_dir, &filename, 0.85)?;
    let uia_info = uia::inspect_point(0, 0, false);

    let step = StepRecord {
        id: step_id,
        project_id,
        section_id: None,
        step_number: 1,
        title: "Manual Snapshot".to_string(),
        rich_instructions: "<p>Manual screenshot captured.</p>".to_string(),
        action_type: "snapshot".to_string(),
        screenshot_path: cap.file_path.to_string_lossy().to_string(),
        original_width: cap.width as i32,
        original_height: cap.height as i32,
        click_x: (cap.width / 2) as i32,
        click_y: (cap.height / 2) as i32,
        uia_name: uia_info.name,
        uia_control_type: uia_info.control_type,
        uia_app_name: uia_info.app_name,
        annotations_json: "[]".to_string(),
        is_password: false,
        created_at: now as i64,
    };

    let _ = state.db.insert_step(&step);
    let _ = app.emit("step-captured", &step);

    Ok(step)
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectRecord>, String> {
    state.db.list_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, id: String) -> Result<Option<ProjectRecord>, String> {
    state.db.get_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project(state: State<'_, AppState>, project: ProjectRecord) -> Result<(), String> {
    state.db.insert_project(&project).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.db.delete_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_steps(state: State<'_, AppState>, project_id: String) -> Result<Vec<StepRecord>, String> {
    state.db.list_steps(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_step(state: State<'_, AppState>, step: StepRecord) -> Result<(), String> {
    state.db.insert_step(&step).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_step(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.db.delete_step(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_data_path(state: State<'_, AppState>) -> String {
    state.app_data_dir.to_string_lossy().to_string()
}
