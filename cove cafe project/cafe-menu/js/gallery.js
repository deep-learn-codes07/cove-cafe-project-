import { supabase } from "./supabase.js";
import { escapeHtml } from "./ui.js";

const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp)$/i;

const elements = {
  section: document.getElementById("gallerySection"),
  grid: document.getElementById("storageGalleryGrid"),
  status: document.getElementById("storageGalleryStatus"),
  lightbox: document.getElementById("storageGalleryLightbox"),
  lightboxImage: document.getElementById("storageGalleryLightboxImage"),
  close: document.getElementById("storageGalleryClose"),
  previous: document.getElementById("storageGalleryPrev"),
  next: document.getElementById("storageGalleryNext"),
};

const state = {
  images: [],
  activeIndex: 0,
};

if (elements.section && elements.grid) {
  initGallery();
}

async function initGallery() {
  bindLightboxEvents();
  await loadGalleryImages();
}

async function loadGalleryImages() {
  setStatus("loading", "Loading gallery...");
  renderSkeletons();

  try {
    const { data, error } = await supabase.storage
      .from("photo")
      .list("gallery food", {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) throw error;

    const files = (data || [])
      .filter((file) => file?.name && IMAGE_EXTENSIONS.test(file.name))
      .sort(sortNewestFirst);

    if (!files.length) {
      state.images = [];
      elements.grid.innerHTML = `<p class="storage-gallery-message">No gallery images available.</p>`;
      setStatus("empty", "");
      return;
    }

    state.images = files.map((file) => {
      const path = `gallery/${file.name}`;
      const { data: publicUrlData } = supabase.storage
        .from("photo")
        .getPublicUrl(path);

      return {
        name: file.name,
        path,
        createdAt: file.created_at || file.updated_at || file.last_accessed_at || "",
        url: publicUrlData.publicUrl,
      };
    });

    renderGallery();
    setStatus("ready", "");
  } catch (error) {
    console.error("[Gallery] Unable to load Supabase Storage images:", error);
    state.images = [];
    elements.grid.innerHTML = `<p class="storage-gallery-message">Unable to load gallery.</p>`;
    setStatus("error", "");
  }
}

function renderGallery() {
  elements.grid.innerHTML = state.images
    .map((image, index) => `
      <button class="storage-gallery-card" type="button" data-gallery-index="${index}" aria-label="Open gallery image ${index + 1}">
        <img src="${escapeHtml(image.url)}" alt="Cove Cafe gallery image ${index + 1}" loading="lazy" decoding="async" />
      </button>
    `)
    .join("");

  elements.grid.querySelectorAll(".storage-gallery-card").forEach((card) => {
    card.addEventListener("click", () => {
      openLightbox(Number(card.dataset.galleryIndex || 0));
    });
  });
}

function renderSkeletons() {
  elements.grid.innerHTML = Array.from({ length: 8 }, () => `<div class="storage-gallery-skeleton"></div>`).join("");
}

function bindLightboxEvents() {
  elements.close?.addEventListener("click", closeLightbox);
  elements.previous?.addEventListener("click", showPreviousImage);
  elements.next?.addEventListener("click", showNextImage);

  elements.lightbox?.addEventListener("click", (event) => {
    if (event.target === elements.lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!elements.lightbox || elements.lightbox.hidden) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showPreviousImage();
    if (event.key === "ArrowRight") showNextImage();
  });
}

function openLightbox(index) {
  if (!state.images.length || !elements.lightbox || !elements.lightboxImage) return;

  state.activeIndex = clampIndex(index);
  updateLightboxImage();
  elements.lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!elements.lightbox) return;
  elements.lightbox.hidden = true;
  document.body.style.overflow = "";
}

function showPreviousImage() {
  if (!state.images.length) return;
  state.activeIndex = clampIndex(state.activeIndex - 1);
  updateLightboxImage();
}

function showNextImage() {
  if (!state.images.length) return;
  state.activeIndex = clampIndex(state.activeIndex + 1);
  updateLightboxImage();
}

function updateLightboxImage() {
  const image = state.images[state.activeIndex];
  if (!image || !elements.lightboxImage) return;

  elements.lightboxImage.src = image.url;
  elements.lightboxImage.alt = `Cove Cafe gallery image ${state.activeIndex + 1}`;
}

function setStatus(mode, message) {
  if (!elements.status) return;

  elements.status.className = `storage-gallery-status ${mode}`;
  elements.status.innerHTML = message
    ? `<span class="gallery-spinner" aria-hidden="true"></span>${escapeHtml(message)}`
    : "";
  elements.status.hidden = !message;
}

function sortNewestFirst(a, b) {
  const dateA = Date.parse(a.created_at || a.updated_at || a.last_accessed_at || "") || 0;
  const dateB = Date.parse(b.created_at || b.updated_at || b.last_accessed_at || "") || 0;

  if (dateA !== dateB) return dateB - dateA;
  return String(b.name || "").localeCompare(String(a.name || ""));
}

function clampIndex(index) {
  const total = state.images.length;
  return ((index % total) + total) % total;
}
