import { supabase, getCurrentSession, upsertUserProfile } from "./supabase.js";

const state = { mode: "signin" };

const els = {
  gate: document.querySelector("#authGate"),
  title: document.querySelector("#authGateTitle"),
  text: document.querySelector("#authGateText"),
  signInForm: document.querySelector("#popupSignInForm"),
  signInEmail: document.querySelector("#popupSignInEmail"),
  signInPassword: document.querySelector("#popupSignInPassword"),
  signUpForm: document.querySelector("#popupSignUpForm"),
  signUpName: document.querySelector("#popupSignUpName"),
  signUpEmail: document.querySelector("#popupSignUpEmail"),
  signUpPassword: document.querySelector("#popupSignUpPassword"),
  signUpPhone: document.querySelector("#popupSignUpPhone"),
  signInTab: document.querySelector("#popupSignInTab"),
  signUpTab: document.querySelector("#popupSignUpTab"),
  google: document.querySelector("#popupGoogleAuth"),
  error: document.querySelector("#popupAuthErr"),
  info: document.querySelector("#popupAuthInfo")
};

export async function requireMenuAuth() {
  wirePopupAuth();

  try {
    const session = await getCurrentSession();
    if (!session) {
      showGate();
      return null;
    }

    try {
      await upsertUserProfile(session.user);
    } catch (profileError) {
      console.error(profileError);
    }

    document.body.classList.remove("menu-locked");
    if (els.gate) els.gate.hidden = true;
    return session;
  } catch (error) {
    console.error(error);
    showGate();
    return null;
  }
}

function wirePopupAuth() {
  if (els.gate?.dataset.wired === "true") return;
  if (els.gate) els.gate.dataset.wired = "true";

  els.signInForm?.addEventListener("submit", handleSignIn);
  els.signUpForm?.addEventListener("submit", handleSignUp);
  els.google?.addEventListener("click", handleGoogleAuth);
  els.signInTab?.addEventListener("click", () => setMode("signin"));
  els.signUpTab?.addEventListener("click", () => setMode("signup"));

  setMode("signin");
}

function showGate() {
  document.body.classList.add("menu-locked");
  if (els.gate) els.gate.hidden = false;
}

function setMode(mode) {
  state.mode = mode;
  clearMessages();

  const isSignUp = mode === "signup";
  if (els.title) els.title.textContent = isSignUp ? "Create account" : "Login required";
  if (els.text) {
    els.text.textContent = isSignUp
      ? "Create an account to access the Cove cafe menu."
      : "Please sign in to access the Cove cafe menu.";
  }
  if (els.signInForm) els.signInForm.hidden = isSignUp;
  if (els.signUpForm) els.signUpForm.hidden = !isSignUp;
  els.signInTab?.classList.toggle("active", !isSignUp);
  els.signUpTab?.classList.toggle("active", isSignUp);
  els.signInTab?.setAttribute("aria-selected", String(!isSignUp));
  els.signUpTab?.setAttribute("aria-selected", String(isSignUp));
}

function showError(message) {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.hidden = false;
  if (els.info) els.info.hidden = true;
}

function showInfo(message) {
  if (!els.info) return;
  els.info.textContent = message;
  els.info.hidden = false;
  if (els.error) els.error.hidden = true;
}

function clearMessages() {
  if (els.error) els.error.hidden = true;
  if (els.info) els.info.hidden = true;
}

function normalizePhoneNumber(phone = "") {
  const digits = phone.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\+?\d{11,15}$/.test(phone)) return phone.startsWith("+") ? phone : `+${digits}`;
  return null;
}

async function handleSignIn(event) {
  event.preventDefault();
  clearMessages();
  setLoading(els.signInForm, true);

  const email = els.signInEmail?.value?.trim();
  const password = els.signInPassword?.value;
  if (!email || !password) {
    setLoading(els.signInForm, false);
    return showError("Please enter both email and password.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setLoading(els.signInForm, false);
    return showError(error.message);
  }

  try {
    await upsertUserProfile(data?.user);
  } catch (profileError) {
    console.error(profileError);
  }

  window.location.reload();
}

async function handleSignUp(event) {
  event.preventDefault();
  clearMessages();
  setLoading(els.signUpForm, true);

  const fullName = els.signUpName?.value?.trim();
  const email = els.signUpEmail?.value?.trim();
  const password = els.signUpPassword?.value;
  const rawPhone = els.signUpPhone?.value?.trim();
  const phone = rawPhone ? normalizePhoneNumber(rawPhone) : "";

  if (!fullName || !email || !password) {
    setLoading(els.signUpForm, false);
    return showError("Full name, email, and password are required.");
  }
  if (rawPhone && !phone) {
    setLoading(els.signUpForm, false);
    return showError("Enter a valid 10-digit phone number, e.g. 9000000000.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      }
    }
  });

  if (error) {
    setLoading(els.signUpForm, false);
    return showError(error.message);
  }

  if (data?.session && data?.user) {
    try {
      await upsertUserProfile(data.user);
    } catch (profileError) {
      console.error(profileError);
    }
    window.location.reload();
    return;
  }

  els.signUpForm?.reset();
  setLoading(els.signUpForm, false);
  setMode("signin");
  showInfo("Account created. Check your email to confirm, then sign in here.");
}

async function handleGoogleAuth() {
  clearMessages();
  if (els.google) els.google.disabled = true;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("./menu.html", window.location.href).href
    }
  });

  if (error) {
    if (els.google) els.google.disabled = false;
    showError(error.message);
  }
}

function setLoading(form, loading) {
  const button = form?.querySelector("button[type='submit']");
  if (!button) return;
  button.disabled = loading;
  button.dataset.originalText ??= button.textContent;
  button.textContent = loading ? "Please wait..." : button.dataset.originalText;
}
