import { fetchCategories, fetchSubcategories, fetchMenuItems, publicImageUrl, CAFE } from "./supabase.js";
import { $, $$, setYear, renderCard, openModal, escapeHtml, formatPrice } from "./ui.js";
import { requireMenuAuth } from "./auth-gate.js";

setYear();

const session = await requireMenuAuth();

const state = {
  view: "categories", // categories, subcategories, menu
  categories: [],
  subcategories: [],
  menuItems: [],
  selectedCategoryId: null,
  selectedSubcategoryId: null,
  query: ""
};

const main = $("#menuMain");
const search = $("#searchInput");
const clearBtn = $("#clearSearch");
const breadcrumb = $("#breadcrumb") || createBreadcrumb();

if (session) {
  init();
}

function createBreadcrumb() {
  const div = document.createElement("div");
  div.id = "breadcrumb";
  div.className = "breadcrumb";
  div.hidden = true;
  main.parentElement.insertBefore(div, main);
  return div;
}

async function init() {
  try {
    showSkeletons(4);
    state.categories = await fetchCategories();
    renderCategories();
  } catch (e) {
    console.error(e);
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">Couldn't load menu. Make sure Supabase is configured.</p>`;
  }
}

function showSkeletons(count = 4) {
  main.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "skeleton-grid";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    grid.appendChild(card);
  }
  main.appendChild(grid);
}

function renderBreadcrumb() {
  const crumbs = [];
  crumbs.push(`<button class="crumb" data-action="back-to-categories">Menu</button>`);
  
  if (state.view === "subcategories" && state.selectedCategoryId) {
    const cat = state.categories.find(c => c.id === state.selectedCategoryId);
    crumbs.push(cat?.name || "Category");
  } else if (state.view === "menu" && state.selectedCategoryId) {
    const cat = state.categories.find(c => c.id === state.selectedCategoryId);
    crumbs.push(`<button class="crumb" data-action="back-to-subcategories">${cat?.name || "Category"}</button>`);
    
    if (state.selectedSubcategoryId) {
      const subcat = state.subcategories.find(s => s.id === state.selectedSubcategoryId);
      crumbs.push(subcat?.name || "Subcategory");
    }
  }
  
  breadcrumb.innerHTML = crumbs.join(" / ");
  breadcrumb.hidden = state.view === "categories";
  
  $$("[data-action]", breadcrumb).forEach(btn => {
    btn.addEventListener("click", e => handleBreadcrumbClick(e.target.dataset.action));
  });
}

function handleBreadcrumbClick(action) {
  if (action === "back-to-categories") {
    state.view = "categories";
    state.selectedCategoryId = null;
    state.selectedSubcategoryId = null;
    search.value = "";
    state.query = "";
    clearBtn.hidden = true;
    renderCategories();
  } else if (action === "back-to-subcategories") {
    state.view = "subcategories";
    state.selectedSubcategoryId = null;
    search.value = "";
    state.query = "";
    clearBtn.hidden = true;
    renderSubcategories(state.selectedCategoryId);
  }
}

function renderCategories() {
  state.view = "categories";
  renderBreadcrumb();
  main.innerHTML = "";
  
  if (state.query) {
    const filtered = state.categories.filter(c => 
      c.name.toLowerCase().includes(state.query.toLowerCase())
    );
    renderCategoryGrid(filtered);
  } else {
    renderCategoryGrid(state.categories);
  }
}

function renderCategoryGrid(categories) {
  if (!categories.length) {
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">No categories found.</p>`;
    return;
  }
  
  main.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "category-grid";
  
  categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-card glass";
    card.innerHTML = `
      <div class="card-image">
        <img src="${publicImageUrl(cat.image_url)}" alt="${escapeHtml(cat.name)}" loading="lazy" />
        <div class="card-overlay"></div>
      </div>
      <div class="card-content">
        <h3>${escapeHtml(cat.name)}</h3>
      </div>
    `;
    card.addEventListener("click", () => selectCategory(cat.id));
    grid.appendChild(card);
  });
  
  main.appendChild(grid);
}

async function selectCategory(categoryId) {
  state.selectedCategoryId = categoryId;
  try {
    showSkeletons(6);
    state.subcategories = await fetchSubcategories(categoryId);
    renderSubcategories(categoryId);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">Couldn't load subcategories.</p>`;
  }
}

function renderSubcategories(categoryId) {
  state.view = "subcategories";
  renderBreadcrumb();
  main.innerHTML = "";
  
  let subcats = state.subcategories;
  
  if (state.query) {
    subcats = subcats.filter(s => 
      s.name.toLowerCase().includes(state.query.toLowerCase())
    );
  }
  
  if (!subcats.length) {
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">No subcategories found.</p>`;
    return;
  }
  
  const grid = document.createElement("div");
  grid.className = "subcategory-grid";
  
  subcats.forEach(subcat => {
    const itemCount = state.menuItems.filter(i => i.subcategory_id === subcat.id).length || "—";
    const card = document.createElement("div");
    card.className = "subcategory-card glass";
    card.innerHTML = `
      <div class="card-image">
        <img src="${publicImageUrl(subcat.image_url)}" alt="${escapeHtml(subcat.name)}" loading="lazy" />
        <div class="card-overlay"></div>
      </div>
      <div class="card-content">
        <h3>${escapeHtml(subcat.name)}</h3>
        <span class="item-count">${itemCount} items</span>
      </div>
    `;
    card.addEventListener("click", () => selectSubcategory(subcat.id));
    grid.appendChild(card);
  });
  
  main.appendChild(grid);
}

async function selectSubcategory(subcategoryId) {
  state.selectedSubcategoryId = subcategoryId;
  try {
    showSkeletons(8);
    const items = await fetchMenuItems(subcategoryId);
    state.menuItems = items;
    renderMenuItems(items);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">Couldn't load menu items.</p>`;
  }
}

function renderMenuItems(items) {
  state.view = "menu";
  renderBreadcrumb();
  main.innerHTML = "";
  
  let filtered = items;
  
  if (state.query) {
    filtered = items.filter(i => {
      const q = state.query.toLowerCase();
      return [i.name, i.description, i.ingredients, i.allergens].some(v => 
        (v ?? "").toLowerCase().includes(q)
      );
    });
  }
  
  if (!filtered.length) {
    main.innerHTML = `<p class="muted" style="text-align:center;padding:40px">No items found.</p>`;
    return;
  }
  
  const grid = document.createElement("div");
  grid.className = "menu-grid";
  
  filtered.forEach(item => {
    const card = renderCard(item);
    card.addEventListener("click", () => showItem(item));
    grid.appendChild(card);
  });
  
  main.appendChild(grid);
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
  t = setTimeout(() => {
    state.query = e.target.value;
    if (state.view === "categories") renderCategories();
    else if (state.view === "subcategories") renderSubcategories(state.selectedCategoryId);
    else if (state.view === "menu") renderMenuItems(state.menuItems);
  }, 120);
});

clearBtn.addEventListener("click", () => {
  search.value = "";
  state.query = "";
  clearBtn.hidden = true;
  if (state.view === "categories") renderCategories();
  else if (state.view === "subcategories") renderSubcategories(state.selectedCategoryId);
  else if (state.view === "menu") renderMenuItems(state.menuItems);
});
