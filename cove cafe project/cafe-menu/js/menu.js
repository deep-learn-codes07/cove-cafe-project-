import {
  CAFE,
  fetchCategories,
  fetchMenuItems,
  fetchSubcategories,
  publicImageUrl,
} from "./supabase.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const els = {
  backButton: $("#backButton"),
  categorySelect: $("#categorySelect"),
  vegOnly: $("#vegOnly"),
  searchButton: $("#searchButton"),
  searchPanel: $("#searchPanel"),
  searchInput: $("#searchInput"),
  clearSearch: $("#clearSearch"),
  categoryStrip: $("#categoryStrip"),
  subcategoryList: $("#subcategoryList"),
  menuSections: $("#menuSections"),
  menuStatus: $("#menuStatus"),
  modal: $("#itemModal"),
  modalClose: $("#modalClose"),
  modalImageWrap: $("#modalImageWrap"),
  modalImage: $("#modalImage"),
  modalFoodDot: $("#modalFoodDot"),
  modalName: $("#modalName"),
  modalPrice: $("#modalPrice"),
  modalBadges: $("#modalBadges"),
  modalDescription: $("#modalDescription"),
  modalIngredients: $("#modalIngredients"),
  modalAllergens: $("#modalAllergens"),
  modalOrder: $("#modalOrder"),
};

const state = {
  categories: [],
  subcategories: [],
  sections: [],
  selectedCategoryId: "",
  activeSubcategoryId: "",
  query: "",
  vegOnly: false,
  itemById: new Map(),
  observer: null,
};

if (localStorage.getItem("coveCafeLoggedIn") !== "true") {
  window.location.replace("./index.html");
} else {
  init();
}

async function init() {
  bindBaseEvents();
  renderLoading();

  try {
    state.categories = await fetchCategories();

    if (!state.categories.length) {
      renderEmpty("No menu categories are available right now.");
      return;
    }

    state.selectedCategoryId = getInitialCategoryId() || String(state.categories[0].id);
    renderCategories();
    await loadCategory(state.selectedCategoryId);
  } catch (error) {
    console.error(error);
    renderError("The menu could not be loaded. Please check the Supabase menu tables and public access policies.");
  }
}

function bindBaseEvents() {
  els.backButton?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "./index.html";
  });

  els.categorySelect?.addEventListener("change", async (event) => {
    await loadCategory(event.target.value);
  });

  els.vegOnly?.addEventListener("change", () => {
    state.vegOnly = els.vegOnly.checked;
    renderSections();
    setupSectionObserver();
  });

  els.searchButton?.addEventListener("click", () => {
    const willOpen = els.searchPanel.hidden;
    els.searchPanel.hidden = !willOpen;
    document.body.classList.toggle("search-open", willOpen);

    if (willOpen) {
      requestAnimationFrame(() => els.searchInput?.focus());
    } else {
      state.query = "";
      els.searchInput.value = "";
      els.clearSearch.hidden = true;
      renderSections();
      setupSectionObserver();
    }
  });

  let searchTimer = 0;
  els.searchInput?.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    els.clearSearch.hidden = !event.target.value;
    searchTimer = window.setTimeout(() => {
      state.query = event.target.value.trim().toLowerCase();
      renderSections();
      setupSectionObserver();
    }, 120);
  });

  els.clearSearch?.addEventListener("click", () => {
    state.query = "";
    els.searchInput.value = "";
    els.clearSearch.hidden = true;
    els.searchInput.focus();
    renderSections();
    setupSectionObserver();
  });

  els.modalClose?.addEventListener("click", closeModal);
  els.modal?.addEventListener("click", (event) => {
    if (event.target === els.modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.modal.hidden) closeModal();
  });
}

function renderLoading() {
  els.menuStatus.textContent = "Loading Cove Cafe menu...";
  els.menuSections.innerHTML = `
    <div class="loading-grid" aria-hidden="true">
      <div class="loading-card"></div>
      <div class="loading-card"></div>
      <div class="loading-card"></div>
      <div class="loading-card"></div>
    </div>
  `;
}

function renderCategories() {
  els.categorySelect.innerHTML = state.categories
    .map((category) => {
      const selected = String(category.id) === state.selectedCategoryId ? "selected" : "";
      return `<option value="${escapeHtml(category.id)}" ${selected}>${escapeHtml(category.name)}</option>`;
    })
    .join("");

  els.categoryStrip.innerHTML = state.categories
    .map((category) => {
      const active = String(category.id) === state.selectedCategoryId ? "active" : "";
      return `
        <button class="category-card ${active}" type="button" data-category-id="${escapeHtml(category.id)}">
          <span class="category-image">${renderImage(category.image_url, category.name)}</span>
          <span>${escapeHtml(category.name)}</span>
        </button>
      `;
    })
    .join("");

  $$(".category-card", els.categoryStrip).forEach((button) => {
    button.addEventListener("click", async () => {
      await loadCategory(button.dataset.categoryId);
    });
  });

  $(".category-card.active", els.categoryStrip)?.scrollIntoView({ block: "nearest", inline: "center" });
}

async function loadCategory(categoryId) {
  if (!categoryId) return;

  state.selectedCategoryId = String(categoryId);
  state.activeSubcategoryId = "";
  state.itemById.clear();

  renderCategories();
  renderLoading();
  els.subcategoryList.innerHTML = "";

  try {
    state.subcategories = await fetchSubcategories(categoryId);

    if (!state.subcategories.length) {
      state.sections = [];
      renderEmpty("No subcategories are available for this category.");
      return;
    }

    renderSubcategories();

    const sections = await Promise.all(
      state.subcategories.map(async (subcategory) => {
        const items = await fetchMenuItems(subcategory.id);
        return {
          subcategory,
          items: sortByDisplayOrder(items),
        };
      })
    );

    state.sections = sections;
    sections.forEach((section) => {
      section.items.forEach((item) => state.itemById.set(String(item.id), item));
    });

    renderSections();
    setupSectionObserver();
    scrollToTopOfMenu();
  } catch (error) {
    console.error(error);
    renderError("This category could not be loaded from Supabase.");
  }
}

function renderSubcategories() {
  els.subcategoryList.innerHTML = state.subcategories
    .map((subcategory) => `
      <button class="subcategory-card" type="button" data-subcategory-id="${escapeHtml(subcategory.id)}">
        <span class="subcategory-image">${renderImage(subcategory.image_url, subcategory.name)}</span>
        <strong>${escapeHtml(subcategory.name)}</strong>
      </button>
    `)
    .join("");

  $$(".subcategory-card", els.subcategoryList).forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(`#subcategory-${cssSafeId(button.dataset.subcategoryId)}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderSections() {
  const filteredSections = getFilteredSections();
  const totalItems = state.sections.reduce((sum, section) => sum + section.items.length, 0);
  const visibleItems = filteredSections.reduce((sum, section) => sum + section.items.length, 0);

  els.menuStatus.textContent = buildStatusText(totalItems, visibleItems);

  if (!filteredSections.length) {
    els.menuSections.innerHTML = `<div class="empty-state">No menu items match the selected filters.</div>`;
    return;
  }

  els.menuSections.innerHTML = filteredSections
    .map((section) => `
      <section class="subcategory-section" id="subcategory-${cssSafeId(section.subcategory.id)}" data-subcategory-id="${escapeHtml(section.subcategory.id)}">
        <div class="section-heading">
          <h2>${escapeHtml(section.subcategory.name)}</h2>
          <span>${section.items.length} ${section.items.length === 1 ? "item" : "items"}</span>
        </div>
        <div class="items-grid">
          ${section.items.map(renderMenuCard).join("")}
        </div>
      </section>
    `)
    .join("");

  $$(".menu-card", els.menuSections).forEach((card) => {
    const open = () => {
      const item = state.itemById.get(String(card.dataset.itemId));
      if (item) openItemModal(item);
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function getFilteredSections() {
  return state.sections
    .map((section) => {
      const items = section.items.filter((item) => {
        if (state.vegOnly && !item.is_veg) return false;
        if (!state.query) return true;

        const searchable = [
          item.name,
          item.description,
          item.ingredients,
          item.allergens,
          section.subcategory.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(state.query);
      });

      return { ...section, items };
    })
    .filter((section) => section.items.length);
}

function renderMenuCard(item) {
  const vegClass = item.is_veg ? "" : "nonveg";
  const bestSeller = item.is_bestseller ? `<span class="badge">Bestseller</span>` : "";
  const soldOut = item.is_available === false ? `<span class="badge sold-out">Sold out</span>` : "";

  return `
    <article class="menu-card ${item.is_available === false ? "unavailable" : ""}" role="button" tabindex="0" data-item-id="${escapeHtml(item.id)}">
      <div class="card-top">
        <span class="food-dot ${vegClass}" aria-label="${item.is_veg ? "Veg" : "Non veg"}"></span>
        <span class="card-badges">${bestSeller}${soldOut}</span>
      </div>
      <div class="card-title-line">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="price">${formatPrice(item.price)}</span>
      </div>
      <p class="description">${escapeHtml(item.description || "Details available inside.")}</p>
      <div class="card-footer">
        <span class="know-more">Know More</span>
        <i class="i-chevron-right" aria-hidden="true"></i>
      </div>
    </article>
  `;
}

function setupSectionObserver() {
  if (state.observer) state.observer.disconnect();

  const sections = $$(".subcategory-section", els.menuSections);
  const navItems = $$(".subcategory-card", els.subcategoryList);

  if (!sections.length) {
    navItems.forEach((item) => item.classList.remove("active"));
    return;
  }

  const setActive = (subcategoryId) => {
    state.activeSubcategoryId = String(subcategoryId);

    navItems.forEach((item) => {
      const active = String(item.dataset.subcategoryId) === state.activeSubcategoryId;
      item.classList.toggle("active", active);
      if (active) item.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  state.observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible[0]?.target?.dataset?.subcategoryId) {
        setActive(visible[0].target.dataset.subcategoryId);
      }
    },
    {
      root: null,
      rootMargin: "-28% 0px -58% 0px",
      threshold: [0.18, 0.32, 0.48, 0.64],
    }
  );

  sections.forEach((section) => state.observer.observe(section));
  setActive(sections[0].dataset.subcategoryId);
}

function openItemModal(item) {
  const imageUrl = publicImageUrl(item.image_url);
  const isVeg = !!item.is_veg;

  els.modalName.textContent = item.name || "";
  els.modalPrice.textContent = formatPrice(item.price);
  els.modalDescription.textContent = item.description || "No description is available for this item.";
  els.modalIngredients.textContent = item.ingredients || "Not listed";
  els.modalAllergens.textContent = item.allergens || "Not listed";
  els.modalFoodDot.className = `food-dot ${isVeg ? "" : "nonveg"}`;
  els.modalBadges.innerHTML = [
    `<span class="badge ${isVeg ? "" : "nonveg"}">${isVeg ? "Veg" : "Non veg"}</span>`,
    item.is_bestseller ? `<span class="badge">Bestseller</span>` : "",
    item.is_available === false ? `<span class="badge sold-out">Sold out</span>` : "",
  ].join("");

  if (imageUrl) {
    els.modalImageWrap.classList.remove("no-image");
    els.modalImage.src = imageUrl;
    els.modalImage.alt = item.name || "Menu item";
  } else {
    els.modalImage.removeAttribute("src");
    els.modalImage.alt = "";
    els.modalImageWrap.classList.add("no-image");
  }

  const whatsapp = String(CAFE.whatsapp || CAFE.phone || "").replace(/\D/g, "");
  const message = `Hi ${CAFE.name}, I'd like to order ${item.name} (${formatPrice(item.price)}).`;
  els.modalOrder.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

  els.modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modal.hidden = true;
  document.body.style.overflow = "";
}

function renderImage(imagePath, name) {
  const imageUrl = publicImageUrl(imagePath);
  const initial = String(name || "C").trim().charAt(0).toUpperCase() || "C";

  if (!imageUrl) {
    return `<span class="image-fallback">${escapeHtml(initial)}</span>`;
  }

  return `
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async"
      onerror="const fallback=this.nextElementSibling; fallback.hidden=false; this.replaceWith(fallback)" />
    <span class="image-fallback" hidden>${escapeHtml(initial)}</span>
  `;
}

function renderEmpty(message) {
  els.menuStatus.textContent = "";
  els.menuSections.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderError(message) {
  els.menuStatus.textContent = "";
  els.menuSections.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`;
}

function buildStatusText(totalItems, visibleItems) {
  const category = state.categories.find((item) => String(item.id) === state.selectedCategoryId);
  const filterText = [
    state.vegOnly ? "veg only" : "",
    state.query ? "search active" : "",
  ].filter(Boolean);

  if (!totalItems) return `${category?.name || "Menu"} has no available items right now.`;
  if (filterText.length) return `${category?.name || "Menu"}: showing ${visibleItems} of ${totalItems} items (${filterText.join(", ")})`;
  return `${category?.name || "Menu"}: ${totalItems} items`;
}

function scrollToTopOfMenu() {
  $(".category-strip")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getInitialCategoryId() {
  const requested = new URLSearchParams(window.location.search).get("category");
  if (!requested) return "";

  const normalized = normalizeCategoryToken(requested);
  const category = state.categories.find((item) => {
    const id = normalizeCategoryToken(item.id);
    const name = normalizeCategoryToken(item.name);
    const slug = slugify(item.name);
    return normalized === id || normalized === name || normalized === slug;
  });

  return category ? String(category.id) : "";
}

function sortByDisplayOrder(items) {
  return [...(items || [])].sort((a, b) => {
    const orderA = Number(a.display_order ?? 0);
    const orderB = Number(b.display_order ?? 0);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function cssSafeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategoryToken(value) {
  return decodeURIComponent(String(value || "")).trim().toLowerCase();
}

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}
