const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const todoCount = document.getElementById("todoCount");
const healthText = document.getElementById("healthText");
const filterTabs = document.querySelectorAll(".tab-btn");

let todos = [];
let currentFilter = "all";

// 1. Health check server status
async function checkHealth() {
  try {
    const res = await fetch("/health");
    if (res.ok) {
      const data = await res.json();
      healthText.textContent = `Server Aktif (${data.runtime}) - Uptime: ${Math.floor(data.uptime)}s`;
    } else {
      healthText.textContent = "Server merespons dengan kesalahan";
    }
  } catch (err) {
    healthText.textContent = "Koneksi terputus ke server";
  }
}

// 2. Fetch todos from API
async function fetchTodos() {
  try {
    const res = await fetch("/api/todos");
    const json = await res.json();
    if (json.success) {
      todos = json.data;
      renderTodos();
    }
  } catch (err) {
    todoList.innerHTML = `<li class="empty-state">Gagal memuat tugas. Periksa koneksi backend.</li>`;
  }
}

// 3. Render todos to DOM
function renderTodos() {
  const filtered = todos.filter((t) => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  // Update active count
  const activeCount = todos.filter((t) => !t.completed).length;
  todoCount.textContent = `${activeCount} tugas aktif`;

  if (filtered.length === 0) {
    todoList.innerHTML = `<li class="empty-state">Tidak ada tugas dalam kategori ini.</li>`;
    return;
  }

  todoList.innerHTML = filtered
    .map(
      (todo) => `
    <li class="todo-item ${todo.completed ? "completed" : ""}" data-id="${todo.id}">
      <div class="todo-content" onclick="toggleTodo(${todo.id})">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? "checked" : ""} 
          onclick="event.stopPropagation(); toggleTodo(${todo.id})"
        />
        <span class="todo-text">${escapeHtml(todo.title)}</span>
      </div>
      <button class="delete-btn" onclick="deleteTodo(${todo.id})" title="Hapus">?</button>
    </li>
  `
    )
    .join("");
}

// 4. Add new todo
todoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  try {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const json = await res.json();
    if (json.success) {
      todos.unshift(json.data);
      todoInput.value = "";
      renderTodos();
    }
  } catch (err) {
    alert("Gagal menambahkan tugas");
  }
});

// 5. Toggle todo status
async function toggleTodo(id) {
  try {
    const res = await fetch(`/api/todos/${id}/toggle`, {
      method: "PATCH",
    });
    const json = await res.json();
    if (json.success) {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx !== -1) {
        todos[idx] = json.data;
        renderTodos();
      }
    }
  } catch (err) {
    alert("Gagal mengubah status tugas");
  }
}

// 6. Delete todo
async function deleteTodo(id) {
  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      todos = todos.filter((t) => t.id !== id);
      renderTodos();
    }
  } catch (err) {
    alert("Gagal menghapus tugas");
  }
}

// 7. Filter tabs
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderTodos();
  });
});

// Utility: Prevent XSS
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Initial Run
checkHealth();
fetchTodos();
// Periodik health check tiap 15 detik
setInterval(checkHealth, 15000);
