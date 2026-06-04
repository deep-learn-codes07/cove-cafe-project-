import { supabase } from "./supabase.js";

const signInForm = document.querySelector("#signInForm");
const signInEmail = document.querySelector("#signInEmail");
const signInPassword = document.querySelector("#signInPassword");
const googleSignIn = document.querySelector("#googleSignIn");
const phoneForm = document.querySelector("#phoneForm");
const signInPhone = document.querySelector("#signInPhone");

const signUpForm = document.querySelector("#signUpForm");
const signUpName = document.querySelector("#signUpName");
const signUpEmail = document.querySelector("#signUpEmail");
const signUpPassword = document.querySelector("#signUpPassword");
const signUpPhone = document.querySelector("#signUpPhone");
const googleSignUp = document.querySelector("#googleSignUp");

const authErr = document.querySelector("#authErr");
const authInfo = document.querySelector("#authInfo");
// Use explicit .html path so local static servers (e.g. Live Server) won't "Cannot GET /menu"
const redirectTo = `${window.location.origin}/menu.html`;

function showError(message) {
  if (!authErr) return;
  authErr.textContent = message;
  authErr.hidden = false;
  if (authInfo) authInfo.hidden = true;
}

function showInfo(message) {
  if (!authInfo) return;
  authInfo.textContent = message;
  authInfo.hidden = false;
  if (authErr) authErr.hidden = true;
}

function clearMessages() {
  if (authErr) authErr.hidden = true;
  if (authInfo) authInfo.hidden = true;
}

async function handleGoogleAuth() {
  clearMessages();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });
  if (error) showError(error.message);
}

async function handleEmailSignIn(event) {
  event.preventDefault();
  clearMessages();
  const email = signInEmail?.value?.trim();
  const password = signInPassword?.value;
  if (!email || !password) return showError("Please enter both email and password.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);
  window.location.href = redirectTo;
}

async function handlePhoneSignIn(event) {
  event.preventDefault();
  clearMessages();
  const phone = signInPhone?.value?.trim();
  if (!phone) return showError("Please enter a valid phone number.");

  const { error } = await supabase.auth.signInWithOtp({ phone, options: { redirectTo } });
  if (error) return showError(error.message);
  showInfo("OTP sent to your phone. Check your messages and follow the link to complete sign in.");
}

async function handleSignUp(event) {
  event.preventDefault();
  clearMessages();
  const fullName = signUpName?.value?.trim();
  const email = signUpEmail?.value?.trim();
  const password = signUpPassword?.value;
  const phone = signUpPhone?.value?.trim();

  if (!fullName || !email || !password) {
    return showError("Full name, email, and password are required.");
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

  if (error) return showError(error.message);
  if (data?.user) {
    showInfo("Account created successfully. Check your email to confirm and sign in.");
    signUpForm?.reset();
    return;
  }

  showInfo("If you provided a valid email, a confirmation link has been sent.");
}

async function checkExistingSession() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    window.location.href = redirectTo;
  }
}

if (signInForm) {
  signInForm.addEventListener("submit", handleEmailSignIn);
}

if (googleSignIn) {
  googleSignIn.addEventListener("click", handleGoogleAuth);
}

if (phoneForm) {
  phoneForm.addEventListener("submit", handlePhoneSignIn);
}

if (signUpForm) {
  signUpForm.addEventListener("submit", handleSignUp);
}

if (googleSignUp) {
  googleSignUp.addEventListener("click", handleGoogleAuth);
}

checkExistingSession();
