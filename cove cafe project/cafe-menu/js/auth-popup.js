import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  sendCustomerOtp,
  upsertCustomerLogin,
  verifyCustomerOtp,
} from "./supabase.js";

const LOGIN_KEYS = {
  loggedIn: "coveCafeLoggedIn",
  name: "coveCafeUserName",
  phone: "coveCafePhone",
};

const OTP_CONFIG = {
  mode: "test",
  testCode: "123456",
};

const $ = (selector, root = document) => root.querySelector(selector);

const els = {
  modal: $("#coveLoginModal"),
  loginStep: $("#loginStep"),
  otpStep: $("#otpStep"),
  loginForm: $("#coveLoginForm"),
  otpForm: $("#coveOtpForm"),
  backButton: $("#coveOtpBack"),
  name: $("#coveCustomerName"),
  phone: $("#coveCustomerPhone"),
  otp: $("#coveCustomerOtp"),
  message: $("#coveAuthMessage"),
  debugPhone: $("#coveDebugPhone"),
  debugRequest: $("#coveDebugRequest"),
  debugResponse: $("#coveDebugResponse"),
  debugError: $("#coveDebugError"),
};

const state = {
  name: "",
  phone: "",
};

initAuthGate();

function initAuthGate() {
  logSupabaseConfig();
  updateDebugPanel({
    phone: "-",
    request: "Idle",
    response: isTestOtpMode() ? "Test OTP mode enabled" : "Waiting for Send OTP",
    error: "-",
  });
  window.logoutCoveCafe = logoutCoveCafe;
  bindEvents();

  if (isLoggedIn()) {
    unlockWebsite();
    return;
  }

  showLoginPopup();
}

function bindEvents() {
  els.loginForm?.addEventListener("submit", handleSendOtp);
  els.otpForm?.addEventListener("submit", handleVerifyOtp);
  els.backButton?.addEventListener("click", () => {
    setMessage("");
    showStep("login");
  });
  document.querySelectorAll("[data-cove-logout]").forEach((button) => {
    button.addEventListener("click", logoutCoveCafe);
  });
}

async function handleSendOtp(event) {
  event.preventDefault();

  const userName = els.name.value.trim();
  const phone = normalizePhone(els.phone.value);
  updateDebugPanel({
    phone: phone || els.phone.value.trim() || "-",
    request: "Validating Send OTP request",
    response: "-",
    error: "-",
  });

  if (userName.length < 2) {
    updateDebugPanel({ request: "Validation failed", error: "Name is too short" });
    setMessage("Please enter your full name.", "error");
    els.name.focus();
    return;
  }

  if (!phone) {
    updateDebugPanel({
      request: "Validation failed",
      error: "Invalid phone number. Expected +91XXXXXXXXXX",
    });
    setMessage("Invalid phone number. Enter a 10-digit Indian mobile number, e.g. +919876543210.", "error");
    els.phone.focus();
    return;
  }

  setBusy(els.loginForm, true);
  setMessage("Sending OTP...");
  updateDebugPanel({
    phone,
    request: isTestOtpMode() ? "Generating test OTP" : "Sending OTP via Supabase Auth",
    response: "Pending",
    error: "-",
  });

  try {
    console.log("[Cove OTP] Sending OTP...");
    console.log("[Cove OTP] Phone:", phone);
    console.log("[Cove OTP] Mode:", OTP_CONFIG.mode);
    const data = await requestOtp(phone);
    console.log("[Cove OTP] OTP request completed:", data);
    state.name = userName;
    state.phone = phone;
    updateDebugPanel({
      phone,
      request: "Send OTP completed",
      response: "Success",
      error: "-",
    });
    showStep("otp");
    setMessage(getOtpSentMessage(phone), "success");
    requestAnimationFrame(() => els.otp.focus());
  } catch (error) {
    console.error("[Cove OTP] Full Send OTP error:");
    console.error(error);
    updateDebugPanel({
      phone,
      request: "Send OTP failed",
      response: getErrorStatus(error),
      error: getDebugErrorMessage(error),
    });
    setMessage(getFriendlyAuthError(error, "send"), "error");
  } finally {
    setBusy(els.loginForm, false);
  }
}

async function handleVerifyOtp(event) {
  event.preventDefault();

  const token = els.otp.value.trim();
  if (!/^\d{4,8}$/.test(token)) {
    setMessage("Please enter the OTP sent to your mobile number.", "error");
    els.otp.focus();
    return;
  }

  setBusy(els.otpForm, true);
  setMessage("Verifying OTP...");
  updateDebugPanel({
    phone: state.phone || "-",
    request: isTestOtpMode() ? "Verifying test OTP" : "Verifying OTP via Supabase Auth",
    response: "Pending",
    error: "-",
  });

  try {
    console.log("[Cove OTP] Verifying OTP...");
    console.log("[Cove OTP] Phone:", state.phone);
    console.log("[Cove OTP] Mode:", OTP_CONFIG.mode);
    const verifyData = await verifyOtp(state.phone, token);
    console.log("[Cove OTP] OTP verification completed:", verifyData);
    if (!isTestOtpMode()) {
      await upsertCustomerLogin({
        name: state.name,
        phone: state.phone,
      });
    }
    updateDebugPanel({
      phone: state.phone,
      request: "Verify OTP completed",
      response: "Success",
      error: "-",
    });

    localStorage.setItem(LOGIN_KEYS.loggedIn, "true");
    localStorage.setItem(LOGIN_KEYS.name, state.name);
    localStorage.setItem(LOGIN_KEYS.phone, state.phone);

    setMessage("Login verified. Welcome to Cove Cafe.", "success");
    window.setTimeout(unlockWebsite, 260);
  } catch (error) {
    console.error("[Cove OTP] Full Verify OTP error:");
    console.error(error);
    updateDebugPanel({
      phone: state.phone || "-",
      request: "Verify OTP failed",
      response: getErrorStatus(error),
      error: getDebugErrorMessage(error),
    });
    setMessage(getFriendlyAuthError(error, "verify"), "error");
  } finally {
    setBusy(els.otpForm, false);
  }
}

function showLoginPopup() {
  document.body.classList.add("login-locked");
  setPageInert(true);
  els.modal.hidden = false;
  showStep("login");
  requestAnimationFrame(() => els.name?.focus());
}

function unlockWebsite() {
  document.body.classList.remove("login-locked");
  setPageInert(false);
  if (els.modal) els.modal.hidden = true;
  window.dispatchEvent(new Event("coveCafeLogin"));
}

function logoutCoveCafe() {
  localStorage.removeItem(LOGIN_KEYS.loggedIn);
  localStorage.removeItem(LOGIN_KEYS.name);
  localStorage.removeItem(LOGIN_KEYS.phone);

  state.name = "";
  state.phone = "";
  if (els.name) els.name.value = "";
  if (els.phone) els.phone.value = "";
  if (els.otp) els.otp.value = "";

  showLoginPopup();
}

function showStep(step) {
  const isOtp = step === "otp";
  els.loginStep.hidden = isOtp;
  els.otpStep.hidden = !isOtp;
}

function setPageInert(locked) {
  ["main", "footer", ".fab-stack"].forEach((selector) => {
    const element = $(selector);
    if (!element) return;

    if (locked) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    } else {
      element.removeAttribute("inert");
      element.removeAttribute("aria-hidden");
    }
  });
}

function setBusy(form, busy) {
  form.querySelectorAll("button, input").forEach((element) => {
    element.disabled = busy;
  });
}

function setMessage(message, type = "") {
  if (!els.message) return;
  els.message.textContent = message;
  els.message.className = `cove-auth-message ${type}`.trim();
}

function updateDebugPanel({ phone, request, response, error } = {}) {
  if (phone !== undefined && els.debugPhone) els.debugPhone.textContent = phone || "-";
  if (request !== undefined && els.debugRequest) els.debugRequest.textContent = request || "-";
  if (response !== undefined && els.debugResponse) els.debugResponse.textContent = response || "-";
  if (error !== undefined && els.debugError) els.debugError.textContent = error || "-";
}

function isLoggedIn() {
  return localStorage.getItem(LOGIN_KEYS.loggedIn) === "true";
}

function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;

  return "";
}

async function requestOtp(phone) {
  if (!isTestOtpMode()) {
    return sendCustomerOtp(phone);
  }

  console.log("[Cove OTP] Test OTP generated:", OTP_CONFIG.testCode);
  return {
    mode: OTP_CONFIG.mode,
    phone,
    testCode: OTP_CONFIG.testCode,
  };
}

async function verifyOtp(phone, token) {
  if (!isTestOtpMode()) {
    return verifyCustomerOtp(phone, token);
  }

  if (token !== OTP_CONFIG.testCode) {
    const error = new Error(`Invalid test OTP. Use ${OTP_CONFIG.testCode}.`);
    error.name = "TestOtpError";
    error.code = "invalid_test_otp";
    throw error;
  }

  return {
    mode: OTP_CONFIG.mode,
    phone,
    verified: true,
  };
}

function isTestOtpMode() {
  return OTP_CONFIG.mode === "test";
}

function getOtpSentMessage(phone) {
  if (isTestOtpMode()) {
    return `Testing mode: use OTP ${OTP_CONFIG.testCode} for ${phone}.`;
  }

  return `OTP sent to ${phone}.`;
}

function getFriendlyAuthError(error, action = "send") {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);

  if (error?.code === "invalid_test_otp") {
    return `Invalid OTP. For testing, enter ${OTP_CONFIG.testCode}.`;
  }

  if (status === 429 || message.includes("rate")) {
    return "Rate limit exceeded. Please wait a moment before requesting another OTP.";
  }

  if (message.includes("provider") || message.includes("twilio") || message.includes("sms")) {
    return "SMS provider not configured or SMS delivery failed. Please contact Cove Cafe support.";
  }

  if (message.includes("phone provider") || message.includes("phone signup") || message.includes("phone logins are disabled")) {
    return "Phone auth disabled in Supabase. Please enable Phone provider in Authentication settings.";
  }

  if (message.includes("invalid phone") || message.includes("phone")) {
    return "Invalid phone number. Use +91 followed by your 10-digit mobile number.";
  }

  if (action === "verify" || message.includes("invalid token") || message.includes("otp")) {
    return "The OTP is incorrect or expired. Please try again.";
  }

  return "Supabase auth error. Please check the debug panel and browser console.";
}

function getErrorStatus(error) {
  return error?.status ? `HTTP ${error.status}` : error?.name || "Error";
}

function getDebugErrorMessage(error) {
  if (!error) return "-";
  return [
    error.message,
    error.code ? `code: ${error.code}` : "",
    error.status ? `status: ${error.status}` : "",
  ].filter(Boolean).join(" | ") || JSON.stringify(error);
}

function logSupabaseConfig() {
  console.log("[Cove OTP] SUPABASE_URL:", SUPABASE_URL);
  console.log("[Cove OTP] SUPABASE_ANON_KEY present:", Boolean(SUPABASE_ANON_KEY));
  console.log("[Cove OTP] Expected phone format: +91XXXXXXXXXX");
  console.log("[Cove OTP] Mode:", OTP_CONFIG.mode);
  if (isTestOtpMode()) console.log("[Cove OTP] Test OTP:", OTP_CONFIG.testCode);
}
