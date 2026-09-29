use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub tags: String,
    pub author: String,
    pub company_name: String,
    pub accent_color: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StepRecord {
    pub id: String,
    pub project_id: String,
    pub section_id: Option<String>,
    pub step_number: i32,
    pub title: String,
    pub rich_instructions: String,
    pub action_type: String,
    pub screenshot_path: String,
    pub original_width: i32,
    pub original_height: i32,
    pub click_x: i32,
    pub click_y: i32,
    pub uia_name: String,
    pub uia_control_type: String,
    pub uia_app_name: String,
    pub annotations_json: String,
    pub is_password: bool,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SectionRecord {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub order_index: i32,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(db_path)?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                category TEXT DEFAULT 'SOP',
                tags TEXT DEFAULT '',
                author TEXT DEFAULT '',
                company_name TEXT DEFAULT '',
                accent_color TEXT DEFAULT '#2563eb',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sections (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS steps (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                section_id TEXT,
                step_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                rich_instructions TEXT DEFAULT '',
                action_type TEXT DEFAULT 'click',
                screenshot_path TEXT NOT NULL,
                original_width INTEGER NOT NULL,
                original_height INTEGER NOT NULL,
                click_x INTEGER NOT NULL,
                click_y INTEGER NOT NULL,
                uia_name TEXT DEFAULT '',
                uia_control_type TEXT DEFAULT '',
                uia_app_name TEXT DEFAULT '',
                annotations_json TEXT DEFAULT '[]',
                is_password INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn insert_project(&self, p: &ProjectRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, title, description, category, tags, author, company_name, accent_color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                p.id, p.title, p.description, p.category, p.tags,
                p.author, p.company_name, p.accent_color, p.created_at, p.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, category, tags, author, company_name, accent_color, created_at, updated_at FROM projects ORDER BY updated_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                tags: row.get(4)?,
                author: row.get(5)?,
                company_name: row.get(6)?,
                accent_color: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, description, category, tags, author, company_name, accent_color, created_at, updated_at FROM projects WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                tags: row.get(4)?,
                author: row.get(5)?,
                company_name: row.get(6)?,
                accent_color: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        if let Some(r) = rows.next() {
            Ok(Some(r?))
        } else {
            Ok(None)
        }
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM steps WHERE project_id = ?1", params![id])?;
        conn.execute("DELETE FROM sections WHERE project_id = ?1", params![id])?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn insert_step(&self, s: &StepRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO steps (id, project_id, section_id, step_number, title, rich_instructions, action_type, screenshot_path, original_width, original_height, click_x, click_y, uia_name, uia_control_type, uia_app_name, annotations_json, is_password, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                s.id, s.project_id, s.section_id, s.step_number, s.title, s.rich_instructions,
                s.action_type, s.screenshot_path, s.original_width, s.original_height,
                s.click_x, s.click_y, s.uia_name, s.uia_control_type, s.uia_app_name,
                s.annotations_json, if s.is_password { 1 } else { 0 }, s.created_at
            ],
        )?;
        Ok(())
    }

    pub fn list_steps(&self, project_id: &str) -> Result<Vec<StepRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, project_id, section_id, step_number, title, rich_instructions, action_type, screenshot_path, original_width, original_height, click_x, click_y, uia_name, uia_control_type, uia_app_name, annotations_json, is_password, created_at FROM steps WHERE project_id = ?1 ORDER BY step_number ASC")?;
        let rows = stmt.query_map(params![project_id], |row| {
            let is_pwd: i32 = row.get(16)?;
            Ok(StepRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                section_id: row.get(2)?,
                step_number: row.get(3)?,
                title: row.get(4)?,
                rich_instructions: row.get(5)?,
                action_type: row.get(6)?,
                screenshot_path: row.get(7)?,
                original_width: row.get(8)?,
                original_height: row.get(9)?,
                click_x: row.get(10)?,
                click_y: row.get(11)?,
                uia_name: row.get(12)?,
                uia_control_type: row.get(13)?,
                uia_app_name: row.get(14)?,
                annotations_json: row.get(15)?,
                is_password: is_pwd != 0,
                created_at: row.get(17)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn delete_step(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM steps WHERE id = ?1", params![id])?;
        Ok(())
    }
}
