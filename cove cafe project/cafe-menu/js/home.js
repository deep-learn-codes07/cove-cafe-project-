import { fetchCategories, fetchMenuItems, publicImageUrl, CAFE } from "./supabase.js";
import { $, setYear, setOpenStatus, renderCard, openModal, escapeHtml } from "./ui.js";

setYear();
setOpenStatus();
setInterval(setOpenStatus, 60_000);

// Load featured (bestsellers)
async function loadFeaturedItems() {
  const grid = $("#featuredGrid");
  try {
    if (localStorage.getItem("coveCafeLoggedIn") !== "true") {
      grid.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center">Sign in to access the menu and today's favourites.</p>`;
      return;
    }

    const items = await fetchMenuItems();
    const featured = items.filter(i => i.is_bestseller && i.is_available).slice(0, 6);
    grid.innerHTML = "";
    if (!featured.length) {
      grid.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center">Add bestsellers from the admin to feature them here.</p>`;
      return;
    }
    featured.forEach(i => {
      const c = renderCard(i);
      // Link to menu.html with fragment so local servers resolve the file
      c.addEventListener("click", () => location.href = `./menu.html#item-${i.id}`);
      grid.appendChild(c);
    });
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center">Couldn't load menu. Check Supabase config.</p>`;
  }
}

loadFeaturedItems();
loadMenuPreview();
window.addEventListener("coveCafeLogin", loadFeaturedItems);

async function loadMenuPreview() {
  const grid = $("#menuPreviewGrid");
  if (!grid) return;

  try {
    const categories = await fetchCategories();
    const visibleCategories = categories.filter((category) => category?.name);

    if (!visibleCategories.length) {
      grid.innerHTML = `<p class="muted empty-home-message">No menu categories are available right now.</p>`;
      return;
    }

    grid.innerHTML = "";
    visibleCategories.forEach((category) => {
      const slug = slugify(category.name);
      const imageUrl = publicImageUrl(category.image_url);
      const card = document.createElement("article");
      card.className = "menu-category-card glass";
      card.tabIndex = 0;
      card.role = "link";
      card.setAttribute("aria-label", `Open ${category.name} in the menu`);
      card.innerHTML = `
        <div class="menu-category-image">
          ${imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(category.name)}" loading="lazy" decoding="async" />`
            : `<span class="menu-category-fallback">${escapeHtml(getInitial(category.name))}</span>`
          }
        </div>
        <div class="menu-category-content">
          <span class="menu-category-accent">${escapeHtml(getInitial(category.name))}</span>
          <h3>${escapeHtml(toTitleCase(category.name))}</h3>
          <p>${escapeHtml(buildCategoryDescription(category.name))}</p>
        </div>
      `;

      const openCategory = () => {
        window.location.href = `./menu.html?category=${encodeURIComponent(slug)}`;
      };

      card.addEventListener("click", openCategory);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCategory();
        }
      });

      grid.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<p class="muted empty-home-message">Couldn't load categories. Check Supabase config.</p>`;
  }
}

// Share
$("#shareBtn")?.addEventListener("click", async () => {
  const url = location.origin + "/menu.html";
  const data = { title: `${CAFE.name} — Menu`, text: "Check out our menu", url };
  if (navigator.share) { try { await navigator.share(data); } catch {} }
  else { await navigator.clipboard.writeText(url); alert("Menu link copied!"); }
});

// QR
$("#qrBtn")?.addEventListener("click", async () => {
  const url = location.origin + "/menu.html";
  $("#qrUrl").textContent = url;
  const canvas = $("#qrCanvas");
  canvas.innerHTML = `<img alt="QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}"/>`;
  openModal("qrModal");
});

function buildCategoryDescription(name) {
  return `Explore Cove Cafe's ${toTitleCase(name)} selections, crafted fresh with signature flavour.`;
}

function getInitial(value) {
  return String(value || "C").trim().charAt(0).toUpperCase() || "C";
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
