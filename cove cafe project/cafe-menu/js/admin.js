import { supabase, CAFE, publicImageUrl } from "./supabase.js";
import { $, $$, escapeHtml, openModal, closeModal, formatPrice } from "./ui.js";

const loginSection = $("#loginSection");
const dashboard = $("#dashboard");
const logoutBtn = $("#logoutBtn");

let cats = [], subcats = [], items = [];

// --- Auth ---
async function refreshAuth() {
  const { data } = await supabase.auth.getUser();
  if (data?.user) showDashboard();
  else showLogin();
}

function showLogin(){ loginSection.hidden = false; dashboard.hidden = true; logoutBtn.hidden = true; }
async function showDashboard(){
  loginSection.hidden = true; dashboard.hidden = false; logoutBtn.hidden = false;
  await loadAll();
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#loginErr"); err.hidden = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#email").value, password: $("#password").value
  });
  if (error) { err.textContent = error.message; err.hidden = false; return; }
  refreshAuth();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut(); refreshAuth();
});

supabase.auth.onAuthStateChange(() => refreshAuth());
refreshAuth();

// --- Data ---
async function loadAll() {
  const [{ data: c }, { data: s }, { data: i }] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("subcategories").select("*").order("display_order"),
    supabase.from("menu_items").select("*").order("created_at", { ascending: false })
  ]);
  cats = c ?? []; subcats = s ?? []; items = i ?? [];
  renderCats(); renderSubcats(); renderItems();
}

// --- Categories ---
function renderCats() {
  const ul = $("#catList"); ul.innerHTML = "";
  cats.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(c.name)} <small class="muted">#${c.display_order}</small></span>
      <button data-del="${c.id}" aria-label="Delete">✕</button>`;
    ul.appendChild(li);
  });
  ul.onclick = async e => {
    const id = e.target.dataset?.del;
    if (!id) return;
    if (!confirm("Delete this category? Subcategories will keep referencing it.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) alert(error.message); else loadAll();
  };

  // refresh select for subcategories
  const sel = $("#subcatCategory");
  sel.innerHTML = `<option value="">Select Category</option>` + cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

$("#catForm").addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    name: $("#catName").value.trim(),
    image_url: $("#catImageUrl").value.trim() || null,
    display_order: Number($("#catOrder").value || 0)
  };
  const { error } = await supabase.from("categories").insert(payload);
  if (error) return alert(error.message);
  e.target.reset(); loadAll();
});

// --- Subcategories ---
function renderSubcats() {
  const ul = $("#subcatList"); ul.innerHTML = "";
  subcats.forEach(s => {
    const catName = cats.find(c => c.id === s.category_id)?.name || "Unknown";
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(s.name)} <small class="muted">${escapeHtml(catName)} • #${s.display_order}</small></span>
      <button data-del="${s.id}" aria-label="Delete">✕</button>`;
    ul.appendChild(li);
  });
  ul.onclick = async e => {
    const id = e.target.dataset?.del;
    if (!id) return;
    if (!confirm("Delete this subcategory? Menu items will keep referencing it.")) return;
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) alert(error.message); else loadAll();
  };
}

$("#subcatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const catId = $("#subcatCategory").value.trim();
  if (!catId) return alert("Please select a category");
  const payload = {
    category_id: catId,
    name: $("#subcatName").value.trim(),
    image_url: $("#subcatImageUrl").value.trim() || null,
    display_order: Number($("#subcatOrder").value || 0)
  };
  const { error } = await supabase.from("subcategories").insert(payload);
  if (error) return alert(error.message);
  e.target.reset(); loadAll();
});

// --- Items ---
function renderItems() {
  const q = $("#adminSearch").value.trim().toLowerCase();
  const list = items.filter(i => !q || i.name.toLowerCase().includes(q));
  const wrap = $("#adminItems"); wrap.innerHTML = "";
  if (!list.length) { wrap.innerHTML = `<p class="muted">No items yet. Create your first one.</p>`; return; }
  list.forEach(i => {
    const el = document.createElement("div");
    el.className = "admin-item"; el.dataset.id = i.id;
    const img = publicImageUrl(i.image_url);
    el.innerHTML = `
      ${img ? `<img src="${img}" alt=""/>` : `<div style="width:60px;height:60px;border-radius:8px;background:#15151c;display:grid;place-items:center;color:#d4a85c;font-family:'Cormorant Garamond',serif;font-size:24px">${escapeHtml(i.name?.[0] ?? "•")}</div>`}
      <div class="meta">
        <h4>${escapeHtml(i.name)}</h4>
        <small class="muted">₹${formatPrice(i.price)}</small><br/>
        <span class="toggle ${i.is_available ? "on" : "off"}">${i.is_available ? "Available" : "Hidden"}</span>
      </div>`;
    el.addEventListener("click", () => openItemEditor(i));
    wrap.appendChild(el);
  });
}
$("#adminSearch").addEventListener("input", renderItems);

$("#newItemBtn").addEventListener("click", () => openItemEditor(null));

function openItemEditor(item) {
  $("#editorTitle").textContent = item ? "Edit Item" : "New Item";
  $("#itemId").value = item?.id ?? "";
  $("#itemName").value = item?.name ?? "";
  $("#itemSubcategory").value = item?.subcategory_id ?? (subcats[0]?.id ?? "");
  $("#itemPrice").value = item?.price ?? "";
  $("#itemDesc").value = item?.description ?? "";
  $("#itemIngredients").value = item?.ingredients ?? "";
  $("#itemAllergens").value = item?.allergens ?? "";
  $("#itemVeg").checked = item?.is_veg ?? true;
  $("#itemBest").checked = item?.is_bestseller ?? false;
  $("#itemAvail").checked = item?.is_available ?? true;
  $("#currentImg").textContent = item?.image_url ? `Current: ${item.image_url}` : "";
  $("#itemImage").value = "";
  $("#deleteBtn").hidden = !item;
  $("#itemErr").hidden = true;
  
  // Populate subcategory select
  const sel = $("#itemSubcategory");
  sel.innerHTML = subcats.map(s => {
    const catName = cats.find(c => c.id === s.category_id)?.name || "Unknown";
    return `<option value="${s.id}">${escapeHtml(catName)} > ${escapeHtml(s.name)}</option>`;
  }).join("");
  if (item) sel.value = item.subcategory_id;
  
  openModal("itemEditor");
}

$("#itemForm").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#itemErr"); err.hidden = true;
  const id = $("#itemId").value || null;
  const file = $("#itemImage").files?.[0];

  try {
    const payload = {
      name: $("#itemName").value.trim(),
      subcategory_id: $("#itemSubcategory").value,
      price: Number($("#itemPrice").value),
      description: $("#itemDesc").value.trim() || null,
      ingredients: $("#itemIngredients").value.trim() || null,
      allergens: $("#itemAllergens").value.trim() || null,
      is_veg: $("#itemVeg").checked,
      is_bestseller: $("#itemBest").checked,
      is_available: $("#itemAvail").checked
    };

    if (file) {
      const subcatId = payload.subcategory_id;
      const subcat = subcats.find(s => s.id === subcatId);
      const catId = subcat?.category_id;
      const catSlug = (cats.find(c => c.id === catId)?.name || "misc").toLowerCase().replace(/\s+/g, "-");
      const ext = file.name.split(".").pop();
      const path = `${catSlug}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(CAFE.storageBucket).upload(path, file, { upsert: false });
      if (upErr) {
        const message = upErr.message || String(upErr);
        throw new Error(`${message}. If this mentions row-level security, verify Supabase storage policies allow authenticated uploads to bucket '${CAFE.storageBucket}'.`);
      }
      payload.image_url = path;
    }

    if (id) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) throw error;
    }
    closeModal("itemEditor");
    loadAll();
  } catch (ex) {
    err.textContent = ex.message || String(ex); err.hidden = false;
  }
});

$("#deleteBtn").addEventListener("click", async () => {
  const id = $("#itemId").value;
  if (!id || !confirm("Delete this item permanently?")) return;
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return alert(error.message);
  closeModal("itemEditor"); loadAll();
});
