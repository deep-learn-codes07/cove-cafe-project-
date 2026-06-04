import { fetchCategories, fetchMenuItems, publicImageUrl, CAFE } from "./supabase.js";
import { $, $$, setYear, renderCard, openModal, closeModal, escapeHtml, formatPrice } from "./ui.js";

setYear();

const state = {
  cats: [],
  items: [],
  active: "all",
  query: ""
};

const main = $("#menuMain");
const tabs = $("#catTabs");
const search = $("#searchInput");
const clearBtn = $("#clearSearch");

(async function init() {
  try {
    const [cats, items] = await Promise.all([fetchCategories(), fetchMenuItems()]);
    state.cats = cats; state.items = items;
    renderTabs(); renderMenu();
    // Deep-link to item via hash (#item-<id>)
    if (location.hash.startsWith("#item-")) {
      const id = location.hash.slice(6);
      const it = items.find(i => String(i.id) === id);
      if (it) showItem(it);
    }
  } catch (e) {
    console.error(e);
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">Couldn't load menu. Make sure Supabase is configured in <code>js/supabase.js</code>.</p>`;
  }
})();

function renderTabs() {
  tabs.innerHTML = "";
  const all = tabBtn("all", "All", "✦");
  tabs.appendChild(all);
  state.cats.forEach(c => tabs.appendChild(tabBtn(c.id, c.name, c.icon)));
  tabs.addEventListener("click", e => {
    const b = e.target.closest(".cat-tab");
    if (!b) return;
    state.active = b.dataset.id;
    $$(".cat-tab", tabs).forEach(t => t.classList.toggle("active", t === b));
    renderMenu(true);
  });
}

function tabBtn(id, name, icon) {
  const b = document.createElement("button");
  b.className = "cat-tab" + (state.active === id ? " active" : "");
  b.dataset.id = id;
  b.innerHTML = `<span>${icon ? escapeHtml(icon) + " " : ""}</span>${escapeHtml(name)}`;
  return b;
}

function filterItems() {
  const q = state.query.trim().toLowerCase();
  return state.items.filter(i => {
    if (state.active !== "all" && String(i.category_id) !== String(state.active)) return false;
    if (!q) return true;
    const catName = state.cats.find(c => c.id === i.category_id)?.name?.toLowerCase() ?? "";
    return [i.name, i.description, catName].some(v => (v ?? "").toLowerCase().includes(q));
  });
}

function renderMenu(scroll = false) {
  const items = filterItems();
  main.innerHTML = "";
  if (!items.length) {
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">No items found.</p>`;
    return;
  }

  if (state.active === "all" && !state.query) {
    // Group by category
    state.cats.forEach(cat => {
      const list = items.filter(i => i.category_id === cat.id);
      if (!list.length) return;
      const sec = document.createElement("section");
      sec.className = "cat-section";
      sec.id = `cat-${cat.id}`;
      sec.innerHTML = `<h2>${escapeHtml(cat.name)}</h2>`;
      const grid = document.createElement("div"); grid.className = "menu-grid";
      list.forEach(i => grid.appendChild(bindCard(i)));
      sec.appendChild(grid);
      main.appendChild(sec);
    });
  } else {
    const grid = document.createElement("div"); grid.className = "menu-grid";
    items.forEach(i => grid.appendChild(bindCard(i)));
    main.appendChild(grid);
  }
  if (scroll) window.scrollTo({ top: 200, behavior: "smooth" });
}

function bindCard(item) {
  const c = renderCard(item);
  c.addEventListener("click", () => showItem(item));
  return c;
}

function showItem(item) {
  $("#mName").textContent = item.name;
  $("#mPrice").textContent = formatPrice(item.price);
  $("#mDesc").textContent = item.description || "—";
  $("#mIng").textContent = item.ingredients || "Not listed";
  $("#mAll").textContent = item.allergens || "Not listed";
  const img = publicImageUrl(item.image_url);
  const imgEl = $("#mImg");
  if (img) { imgEl.src = img; imgEl.alt = item.name; imgEl.style.display = ""; }
  else imgEl.style.display = "none";

  const badges = [];
  badges.push(`<span class="badge ${item.is_veg ? "veg" : "nonveg"}">${item.is_veg ? "● Veg" : "● Non-Veg"}</span>`);
  if (item.is_bestseller) badges.push(`<span class="badge best">★ Bestseller</span>`);
  if (!item.is_available) badges.push(`<span class="badge soldout">Sold out</span>`);
  $("#mBadges").innerHTML = badges.join("");

  const order = $("#mOrder");
  const msg = `Hi ${CAFE.name}, I'd like to order: ${item.name} (₹${formatPrice(item.price)})`;
  order.href = `https://wa.me/${CAFE.whatsapp}?text=${encodeURIComponent(msg)}`;

  openModal("itemModal");
}

// Search
let t;
search.addEventListener("input", e => {
  clearBtn.hidden = !e.target.value;
  clearTimeout(t);
  t = setTimeout(() => { state.query = e.target.value; renderMenu(); }, 120);
});
clearBtn.addEventListener("click", () => {
  search.value = ""; state.query = ""; clearBtn.hidden = true; renderMenu();
});
