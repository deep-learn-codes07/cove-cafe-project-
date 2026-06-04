// Shared UI helpers
import { CAFE, publicImageUrl } from "./supabase.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export function setYear() {
  const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
}

export function setOpenStatus() {
  const pill = $("#statusPill"); const txt = $("#statusText");
  if (!pill || !txt) return;
  const h = new Date().getHours();
  const open = h >= CAFE.hours.open && h < CAFE.hours.close;
  pill.classList.toggle("open", open);
  pill.classList.toggle("closed", !open);
  txt.textContent = open
    ? `Open now · until ${CAFE.hours.close}:00`
    : `Closed · opens at ${CAFE.hours.open}:00`;
}

export function renderCard(item) {
  const card = document.createElement("article");
  card.className = "card" + (item.is_available ? "" : " unavailable");
  card.dataset.id = item.id;

  const img = publicImageUrl(item.image_url);
  const badges = [];
  if (item.is_bestseller) badges.push(`<span class="badge best">★ Bestseller</span>`);
  if (!item.is_available) badges.push(`<span class="badge soldout">Sold out</span>`);

  card.innerHTML = `
    <div class="card-img">
      ${img
        ? `<img loading="lazy" decoding="async" src="${img}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"/>
           <div class="img-fallback" style="display:none">${item.name?.[0] ?? "•"}</div>`
        : `<div class="img-fallback">${item.name?.[0] ?? "•"}</div>`
      }
      <div class="badges-abs">${badges.join("")}</div>
    </div>
    <div class="card-body">
      <div class="card-title">
        <span class="name">
          <span class="veg-dot ${item.is_veg ? "" : "non"}" aria-label="${item.is_veg ? "Veg" : "Non-veg"}"></span>
          ${escapeHtml(item.name)}
        </span>
      </div>
      ${item.description ? `<p class="card-desc">${escapeHtml(item.description)}</p>` : ""}
      <div class="card-foot">
        <span class="price">${formatPrice(item.price)}</span>
        <span class="muted" style="font-size:12px">Tap for details →</span>
      </div>
    </div>`;
  return card;
}

export function formatPrice(p) {
  const n = Number(p ?? 0);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  m.addEventListener("click", e => {
    if (e.target === m || e.target.closest("[data-close]")) closeModal(id);
  }, { once: false });
  document.addEventListener("keydown", escClose);
  function escClose(e) { if (e.key === "Escape") { closeModal(id); document.removeEventListener("keydown", escClose); } }
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = true;
  document.body.style.overflow = "";
}
