import path from "path";
import { addTodo, deleteTodo, getTodos, toggleTodo } from "./db";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(process.cwd(), "public");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function serveStatic(url: URL) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const decodedPath = decodeURIComponent(requestPath);
  const safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not Found", { status: 404 });
  }

  const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
  return new Response(file, { headers: { "Content-Type": contentType } });
}

export async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/health") {
    return json({
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      runtime: `Bun ${Bun.version}`,
      env: process.env.NODE_ENV || "development",
    });
  }

  if (request.method === "GET" && pathname === "/api/todos") {
    try {
      return json({ success: true, data: getTodos() });
    } catch (error: any) {
      return json({ success: false, error: error.message }, 500);
    }
  }

  if (request.method === "POST" && pathname === "/api/todos") {
    try {
      const body = await readJson(request);
      const title = body && typeof body.title === "string" ? body.title.trim() : "";

      if (!title) {
        return json({ success: false, error: "Title todo wajib diisi!" }, 400);
      }

      return json({ success: true, data: addTodo(title) }, 201);
    } catch (error: any) {
      return json({ success: false, error: error.message }, 500);
    }
  }

  const toggleMatch = pathname.match(/^\/api\/todos\/(\d+)\/toggle$/);
  if (request.method === "PATCH" && toggleMatch) {
    try {
      const updated = toggleTodo(Number(toggleMatch[1]));

      if (!updated) {
        return json({ success: false, error: "Todo tidak ditemukan" }, 404);
      }

      return json({ success: true, data: updated });
    } catch (error: any) {
      return json({ success: false, error: error.message }, 500);
    }
  }

  const deleteMatch = pathname.match(/^\/api\/todos\/(\d+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    try {
      const deleted = deleteTodo(Number(deleteMatch[1]));

      if (!deleted) {
        return json({ success: false, error: "Todo tidak ditemukan" }, 404);
      }

      return json({ success: true, message: "Todo berhasil dihapus" });
    } catch (error: any) {
      return json({ success: false, error: error.message }, 500);
    }
  }

  if (request.method === "GET" || request.method === "HEAD") {
    return await serveStatic(url);
  }

  return json({ success: false, error: "Method tidak didukung" }, 405);
}

export const app = {
  fetch: handleRequest,
  listen(port: number, callback?: () => void) {
    const server = Bun.serve({ port, fetch: handleRequest });
    callback?.();
    return {
      close: () => server.stop(),
    };
  },
};

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: handleRequest });
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
}
