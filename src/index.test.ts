import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "./index";
import http from "http";

let server: http.Server;
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

beforeAll((done) => {
  server = app.listen(TEST_PORT, () => {
    done();
  });
});

describe("Todo API & DevOps Health Check", () => {
  it("GET /health harus mengembalikan status healthy dan runtime Bun", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.runtime).toContain("Bun");
  });

  it("POST /api/todos harus membuat todo baru", async () => {
    const res = await fetch(`${BASE_URL}/api/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Belajar Docker & CI/CD" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Belajar Docker & CI/CD");
    expect(body.data.completed).toBe(false);
  });

  it("GET /api/todos harus mengembalikan daftar todo", async () => {
    const res = await fetch(`${BASE_URL}/api/todos`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
