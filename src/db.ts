import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "todos.db");

// Pastikan direktori database tersedia
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

// Inisialisasi tabel jika belum ada
db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function getTodos(): Todo[] {
  const query = db.query("SELECT id, title, completed, created_at FROM todos ORDER BY id DESC");
  const rows = query.all() as { id: number; title: string; completed: number; created_at: string }[];
  return rows.map((r) => ({
    ...r,
    completed: Boolean(r.completed),
  }));
}

export function addTodo(title: string): Todo {
  const insert = db.prepare("INSERT INTO todos (title, completed) VALUES (?, 0) RETURNING id, title, completed, created_at");
  const row = insert.get(title) as { id: number; title: string; completed: number; created_at: string };
  return {
    ...row,
    completed: Boolean(row.completed),
  };
}

export function toggleTodo(id: number): Todo | null {
  const current = db.query("SELECT completed FROM todos WHERE id = ?").get(id) as { completed: number } | null;
  if (!current) return null;

  const newStatus = current.completed ? 0 : 1;
  const update = db.prepare("UPDATE todos SET completed = ? WHERE id = ? RETURNING id, title, completed, created_at");
  const row = update.get(newStatus, id) as { id: number; title: string; completed: number; created_at: string };
  return {
    ...row,
    completed: Boolean(row.completed),
  };
}

export function deleteTodo(id: number): boolean {
  const result = db.run("DELETE FROM todos WHERE id = ?", [id]);
  return result.changes > 0;
}
