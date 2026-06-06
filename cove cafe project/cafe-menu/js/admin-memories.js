import { supabase } from "./supabase.js";
import { escapeHtml } from "./ui.js";

const els = {
  login: document.getElementById("memoryAdminLogin"),
  dashboard: document.getElementById("memoryAdminDashboard"),
  logout: document.getElementById("memoryAdminLogout"),
  loginForm: document.getElementById("memoryAdminLoginForm"),
  email: document.getElementById("memoryAdminEmail"),
  password: document.getElementById("memoryAdminPassword"),
  loginError: document.getElementById("memoryAdminLoginError"),
  grid: document.getElementById("memoryAdminGrid"),
  status: document.getElementById("memoryAdminStatus"),
  filters: Array.from(document.querySelectorAll(".memory-filter")),
};

const state = {
  memories: [],
  filter: "all",
};

initAdminMemories();

function initAdminMemories() {
  bindEvents();
  refreshAuth();
  supabase.auth.onAuthStateChange(() => refreshAuth());
}

function bindEvents() {
  els.loginForm?.addEventListener("submit", handleLogin);
  els.logout?.addEventListener("click", handleLogout);

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      els.filters.forEach((item) => item.classList.toggle("active", item === button));
      renderMemories();
    });
  });
}

async function refreshAuth() {
  const { data } = await supabase.auth.getUser();
  if (data?.user) showDashboard();
  else showLogin();
}

function showLogin() {
  els.login.hidden = false;
  els.dashboard.hidden = true;
  els.logout.hidden = true;
}

async function showDashboard() {
  els.login.hidden = true;
  els.dashboard.hidden = false;
  els.logout.hidden = false;
  await loadMemories();
  subscribeToMemoryChanges();
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginError.hidden = true;

  const { error } = await supabase.auth.signInWithPassword({
    email: els.email.value,
    password: els.password.value,
  });

  if (error) {
    els.loginError.textContent = error.message;
    els.loginError.hidden = false;
    return;
  }

  refreshAuth();
}

async function handleLogout() {
  await supabase.auth.signOut();
  refreshAuth();
}

async function loadMemories() {
  setStatus("Loading memories...");

  const { data, error } = await supabase
    .from("customer_memories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin Memories] Load failed:", error);
    setStatus("Unable to load memories.");
    return;
  }

  state.memories = data || [];
  renderMemories();
}

let realtimeChannel = null;

function subscribeToMemoryChanges() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel("admin-customer-memories")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "customer_memories" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          state.memories = state.memories.filter((memory) => memory.id !== payload.old.id);
        } else {
          const next = payload.new;
          const index = state.memories.findIndex((memory) => memory.id === next.id);
          if (index >= 0) state.memories[index] = next;
          else state.memories.unshift(next);
        }

        state.memories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderMemories();
      }
    )
    .subscribe();
}

function renderMemories() {
  const filtered = getFilteredMemories();

  if (!state.memories.length) {
    setStatus("No customer memories have been uploaded yet.");
    els.grid.innerHTML = "";
    return;
  }

  if (!filtered.length) {
    setStatus("No memories match this filter.");
    els.grid.innerHTML = "";
    return;
  }

  setStatus(`${filtered.length} ${filtered.length === 1 ? "memory" : "memories"} shown.`);
  els.grid.innerHTML = filtered.map(renderMemoryAdminCard).join("");
  bindCardActions();
}

function renderMemoryAdminCard(memory) {
  const status = memory.approved ? "Approved" : "Pending";

  return `
    <article class="memory-admin-card" data-memory-id="${escapeHtml(memory.id)}">
      <div class="memory-admin-image">
        <img src="${escapeHtml(memory.image_url)}" alt="${escapeHtml(memory.caption || `Memory by ${memory.name || "Guest"}`)}" loading="lazy" decoding="async" />
        <span class="memory-admin-badge ${memory.approved ? "approved" : "pending"}">${status}</span>
      </div>
      <div class="memory-admin-body">
        <div>
          <h3>${escapeHtml(memory.name || "Cove Guest")}</h3>
          <p>${escapeHtml(memory.caption || "No caption provided.")}</p>
        </div>
        <dl>
          <div><dt>Phone</dt><dd>${escapeHtml(memory.phone || "Not available")}</dd></div>
          <div><dt>Date</dt><dd>${escapeHtml(formatDateTime(memory.created_at))}</dd></div>
        </dl>
        <div class="memory-admin-actions">
          <button class="btn btn-primary" type="button" data-action="approve" ${memory.approved ? "disabled" : ""}>
            <i class="i-check"></i>
            Approve
          </button>
          <button class="btn btn-glass" type="button" data-action="reject" ${!memory.approved ? "disabled" : ""}>
            <i class="i-x"></i>
            Reject
          </button>
          <button class="btn btn-ghost danger" type="button" data-action="delete">
            <i class="i-trash"></i>
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindCardActions() {
  els.grid.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-memory-id]");
      const id = card?.dataset.memoryId;
      const action = button.dataset.action;
      if (!id || !action) return;

      if (action === "approve") await updateApproval(id, true);
      if (action === "reject") await updateApproval(id, false);
      if (action === "delete") await deleteMemory(id);
    });
  });
}

async function updateApproval(id, approved) {
  const { error } = await supabase
    .from("customer_memories")
    .update({ approved })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  const memory = state.memories.find((item) => item.id === id);
  if (memory) memory.approved = approved;
  renderMemories();
}

async function deleteMemory(id) {
  const memory = state.memories.find((item) => item.id === id);
  if (!memory || !confirm("Delete this memory permanently?")) return;

  const storageFile = getStorageFile(memory.image_url);
  if (storageFile) {
    const { error: storageError } = await supabase.storage
      .from(storageFile.bucket)
      .remove([storageFile.path]);

    if (storageError) console.warn("[Admin Memories] Storage delete failed:", storageError);
  }

  const { error } = await supabase
    .from("customer_memories")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  state.memories = state.memories.filter((item) => item.id !== id);
  renderMemories();
}

function getFilteredMemories() {
  if (state.filter === "approved") return state.memories.filter((memory) => memory.approved);
  if (state.filter === "pending") return state.memories.filter((memory) => !memory.approved);
  return state.memories;
}

function getStorageFile(imageUrl) {
  const match = String(imageUrl || "").match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!match) return null;

  return {
    bucket: decodeURIComponent(match[1]),
    path: decodeURIComponent(match[2]),
  };
}

function setStatus(message) {
  if (els.status) els.status.textContent = message;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
