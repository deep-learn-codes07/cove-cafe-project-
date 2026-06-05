// ============================================================
// Supabase Client
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://ydphlfdvotsmjaniqgqx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcGhsZmR2b3RzbWphbmlxZ3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTk4OTgsImV4cCI6MjA5NTk5NTg5OH0.1OewMiU6-5WqWQNKICiGqmvZy1nK38Rglc9zjDRsBnw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Cafe config — used across pages
export const CAFE = {
  name: "Cove Cafe",
  phone: "+91 7506420904",
  whatsapp: "91 7506420904 ",
  mapsUrl: "https://www.google.com/maps/place/Cove+Cafe/@19.265027,73.1432628,17z/data=!4m6!3m5!1s0x3be79700183aea35:0x4d8ef17492be4c21!8m2!3d19.265027!4d73.1432628!16s%2Fg%2F11wxg_dfnb?hl=en&entry=ttu&g_ep=EgoyMDI2MDUzMS4wIKXMDSoASAFQAw%3D%3D",
  hours: { open: 8, close: 23 }, // 24h format
  storageBucket: "menu-images"
};

// Helpers
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSubcategories(categoryId) {
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMenuItems(subcategoryId = null) {
  let query = supabase.from("menu_items").select("*");
  if (subcategoryId) {
    query = query.eq("subcategory_id", subcategoryId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function publicImageUrl(path) {
  if (!path) return "";
  if (/^https?:/i.test(path)) return path;
  const { data } = supabase.storage.from(CAFE.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

export async function upsertUserProfile(user) {
  if (!user?.id) return null;

  const metadata = user.user_metadata ?? {};
  const identity = user.identities?.[0];
  const profile = {
    id: user.id,
    email: user.email ?? metadata.email ?? null,
    full_name: metadata.full_name ?? metadata.name ?? null,
    phone: user.phone ?? metadata.phone ?? null,
    provider: identity?.provider ?? user.app_metadata?.provider ?? "email",
    last_sign_in_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
