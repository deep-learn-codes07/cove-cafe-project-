import { supabase } from "./supabase.js";
import { escapeHtml } from "./ui.js";

const MEMORY_BUCKETS = [
  "food-gallery",
  "foof-gallary",
  "food-gallary",
  "foof-gallery",
  "food gallery",
  "foof gallary",
];
const UPLOAD_FOLDER = "uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const els = {
  form: document.getElementById("memoryUploadForm"),
  name: document.getElementById("memoryName"),
  photo: document.getElementById("memoryPhoto"),
  caption: document.getElementById("memoryCaption"),
  submit: document.getElementById("memorySubmit"),
  message: document.getElementById("memoryFormMessage"),
  preview: document.getElementById("memoryPreview"),
  previewImage: document.getElementById("memoryPreviewImage"),
  gallery: document.getElementById("memoriesGallery"),
  count: document.getElementById("memoriesCount"),
};

const state = {
  memories: [],
  previewUrl: "",
};

if (els.form && els.gallery) {
  initMemories();
}

function initMemories() {
  hydrateCustomerName();
  bindEvents();
  loadApprovedMemories();
  subscribeToMemories();
}

function hydrateCustomerName() {
  const storedName = localStorage.getItem("coveCafeUserName");
  if (storedName && els.name && !els.name.value) els.name.value = storedName;
}

function bindEvents() {
  els.photo?.addEventListener("change", handlePhotoPreview);
  els.form?.addEventListener("submit", handleMemoryUpload);
}

function handlePhotoPreview() {
  clearPreview();
  const file = els.photo?.files?.[0];
  if (!file) return;

  const validation = validateImage(file);
  if (!validation.valid) {
    setMessage(validation.message, "error");
    els.photo.value = "";
    return;
  }

  state.previewUrl = URL.createObjectURL(file);
  els.previewImage.src = state.previewUrl;
  els.preview.hidden = false;
  setMessage("");
}

async function handleMemoryUpload(event) {
  event.preventDefault();

  const file = els.photo?.files?.[0];
  const name = els.name.value.trim();
  const caption = els.caption.value.trim();
  const phone = localStorage.getItem("coveCafePhone") || null;

  if (name.length < 2) {
    setMessage("Please enter your name.", "error");
    els.name.focus();
    return;
  }

  const validation = validateImage(file);
  if (!validation.valid) {
    setMessage(validation.message, "error");
    els.photo.focus();
    return;
  }

  setBusy(true);
  setMessage("Uploading your Cove moment...");

  try {
    const extension = getFileExtension(file.name, file.type);
    const filePath = `${UPLOAD_FOLDER}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const uploaded = await uploadToAvailableBucket(filePath, file);

    const { data: publicUrlData } = supabase.storage
      .from(uploaded.bucket)
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("customer_memories")
      .insert({
        name,
        phone,
        image_url: publicUrlData.publicUrl,
        caption: caption || null,
        approved: false,
      });

    if (insertError) throw insertError;

    els.form.reset();
    clearPreview();
    hydrateCustomerName();
    showToast("Memory uploaded. It will appear after approval.");
    setMessage("Thanks for sharing. Your memory is waiting for approval.", "success");
  } catch (error) {
    console.error("[Memories] Upload failed:", error);
    setMessage(error.message || "Unable to upload memory.", "error");
  } finally {
    setBusy(false);
  }
}

async function uploadToAvailableBucket(filePath, file) {
  const bucketErrors = [];

  for (const bucket of MEMORY_BUCKETS) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (!error) return { bucket };

    const message = String(error.message || error.error || error).toLowerCase();
    bucketErrors.push(`${bucket}: ${error.message || error}`);

    if (!message.includes("bucket") && !message.includes("not found")) {
      throw error;
    }
  }

  throw new Error(`Gallery bucket not found. Checked: ${MEMORY_BUCKETS.join(", ")}. In Supabase Storage, copy the exact bucket ID and update MEMORY_BUCKETS in js/memories.js. Details: ${bucketErrors.join(" | ")}`);
}

async function loadApprovedMemories() {
  renderLoading();

  const { data, error } = await supabase
    .from("customer_memories")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Memories] Could not load memories:", error);
    els.gallery.innerHTML = `<p class="memory-empty">Unable to load memories.</p>`;
    updateCount();
    return;
  }

  state.memories = data || [];
  renderMemories();
}

function subscribeToMemories() {
  supabase
    .channel("approved-customer-memories")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "customer_memories" },
      (payload) => {
        const next = payload.new;
        const old = payload.old;

        if (payload.eventType === "DELETE") {
          state.memories = state.memories.filter((memory) => memory.id !== old.id);
          renderMemories();
          return;
        }

        if (!next?.approved) {
          state.memories = state.memories.filter((memory) => memory.id !== next?.id);
          renderMemories();
          return;
        }

        const existingIndex = state.memories.findIndex((memory) => memory.id === next.id);
        if (existingIndex >= 0) state.memories[existingIndex] = next;
        else state.memories.unshift(next);

        state.memories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderMemories();
      }
    )
    .subscribe();
}

function renderLoading() {
  els.gallery.innerHTML = `
    <div class="memory-skeleton"></div>
    <div class="memory-skeleton"></div>
    <div class="memory-skeleton"></div>
  `;
}

function renderMemories() {
  updateCount();

  if (!state.memories.length) {
    els.gallery.innerHTML = `<p class="memory-empty">No approved memories yet.</p>`;
    return;
  }

  els.gallery.innerHTML = state.memories.map(renderMemoryCard).join("");
}

function renderMemoryCard(memory) {
  return `
    <article class="memory-card">
      <div class="memory-card-image">
        <img src="${escapeHtml(memory.image_url)}" alt="${escapeHtml(memory.caption || `Cove Cafe memory by ${memory.name || "Guest"}`)}" loading="lazy" decoding="async" />
      </div>
      <div class="memory-card-body">
        <div class="memory-card-meta">
          <strong>${escapeHtml(memory.name || "Cove Guest")}</strong>
          <span>${escapeHtml(formatDate(memory.created_at))}</span>
        </div>
        ${memory.caption ? `<p>${escapeHtml(memory.caption)}</p>` : ""}
      </div>
    </article>
  `;
}

function validateImage(file) {
  if (!file) return { valid: false, message: "Please choose a photo." };
  if (!ALLOWED_TYPES.has(file.type)) return { valid: false, message: "Only JPG, PNG and WEBP images are allowed." };
  if (file.size > MAX_FILE_SIZE) return { valid: false, message: "Photo must be 5MB or smaller." };
  return { valid: true, message: "" };
}

function getFileExtension(fileName, type) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return extension === "jpeg" ? "jpg" : extension;
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function clearPreview() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = "";
  if (els.previewImage) els.previewImage.removeAttribute("src");
  if (els.preview) els.preview.hidden = true;
}

function setBusy(isBusy) {
  els.submit.disabled = isBusy;
  els.submit.innerHTML = isBusy
    ? `<span class="mini-spinner" aria-hidden="true"></span> Uploading...`
    : `<i class="i-upload"></i> Upload Memory`;
}

function setMessage(message, type = "") {
  els.message.textContent = message;
  els.message.className = `memory-form-message ${type}`.trim();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "memory-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 240);
  }, 3200);
}

function updateCount() {
  if (!els.count) return;
  const count = state.memories.length;
  els.count.textContent = `${count} approved ${count === 1 ? "memory" : "memories"}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
