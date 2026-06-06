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

console.log("[Supabase] Client initialized");
console.log("[Supabase] URL:", SUPABASE_URL);
console.log("[Supabase] anon key present:", Boolean(SUPABASE_ANON_KEY));
console.log("[Supabase] anon key project ref:", getJwtProjectRef(SUPABASE_ANON_KEY));

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

export async function fetchGalleryMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select(`
      *,
      subcategories (
        id,
        name,
        categories (
          id,
          name
        )
      )
    `)
    .eq("is_available", true)
    .not("image_url", "is", null)
    .limit(60);

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

export async function sendCustomerOtp(phone) {
  console.log("Sending OTP...");
  console.log("Phone:", phone);
  console.log("[Supabase Auth] signInWithOtp request:", {
    phone,
    options: { channel: "sms" }
  });

  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: "sms"
    }
  });

  console.log("[Supabase Auth] signInWithOtp response data:", data);
  if (error) {
    console.error("[Supabase Auth] signInWithOtp error:");
    console.error(error);
    throw error;
  }

  return data;
}

export async function verifyCustomerOtp(phone, token) {
  console.log("[Supabase Auth] verifyOtp request:", {
    phone,
    tokenLength: String(token || "").length,
    type: "sms"
  });

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms"
  });

  console.log("[Supabase Auth] verifyOtp response data:", data);
  if (error) {
    console.error("[Supabase Auth] verifyOtp error:");
    console.error(error);
    throw error;
  }

  return data;
}

function getJwtProjectRef(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return payload?.ref || "unknown";
  } catch (error) {
    console.error("[Supabase] Could not decode anon key payload:");
    console.error(error);
    return "invalid-key";
  }
}

export async function upsertCustomerLogin({ name, phone }) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await supabase
    .from("customer_logins")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (findError) throw findError;

  if (existing?.id) {
    const updatePayload = { name, phone, created_at: now };
    const { data, error } = await supabase
      .from("customer_logins")
      .update(updatePayload)
      .eq("phone", phone)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const insertPayload = {
    id: crypto.randomUUID(),
    name,
    phone,
    created_at: now
  };

  const { data, error } = await supabase
    .from("customer_logins")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
