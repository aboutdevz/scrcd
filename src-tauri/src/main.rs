#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use scrcd_lib::{
    db::Database,
    delete_project, delete_step, get_app_data_path, get_project, hooks, list_projects, list_steps,
    manual_snapshot, save_project, save_step, start_recording, stop_recording, AppState,
};
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    hooks::start_hook_thread();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("scrcd_data"));
            let _ = std::fs::create_dir_all(&app_dir);

            let db_path = app_dir.join("scrcd.db");
            let db = Database::new(db_path).expect("Failed to initialize SQLite database");

            app.manage(AppState {
                db: Arc::new(db),
                current_project_id: Mutex::new(None),
                app_data_dir: app_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            manual_snapshot,
            list_projects,
            get_project,
            save_project,
            delete_project,
            list_steps,
            save_step,
            delete_step,
            get_app_data_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
