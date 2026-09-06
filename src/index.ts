import express, { Request, Response } from "express";
import path from "path";
import { getTodos, addTodo, toggleTodo, deleteTodo } from "./db";

export const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Health check endpoint (standar DevOps untuk Docker / Kubernetes / Monitoring)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    runtime: "Bun " + Bun.version,
  });
});

// API Routes
app.get("/api/todos", (req: Request, res: Response) => {
  try {
    const todos = getTodos();
    res.json({ success: true, data: todos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/todos", (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, error: "Title todo wajib diisi!" });
    }
    const newTodo = addTodo(title.trim());
    res.status(201).json({ success: true, data: newTodo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch("/api/todos/:id/toggle", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID tidak valid" });
    }
    const updated = toggleTodo(id);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Todo tidak ditemukan" });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/todos/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID tidak valid" });
    }
    const deleted = deleteTodo(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Todo tidak ditemukan" });
    }
    res.json({ success: true, message: "Todo berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Jalankan server jika dijalankan langsung
if (import.meta.main) {
  app.listen(PORT, () => {
    console.log(`?? Server berjalan di http://localhost:${PORT}`);
    console.log(`?? Environment: ${process.env.NODE_ENV || "development"}`);
  });
}
