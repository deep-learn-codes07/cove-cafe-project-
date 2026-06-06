import { fetchMenuItems, CAFE } from "./supabase.js";
import { $, setYear, setOpenStatus, renderCard, openModal } from "./ui.js";

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
window.addEventListener("coveCafeLogin", loadFeaturedItems);

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
