function setAuthError(message = "") {
  const el = document.getElementById("authError");
  if (el) el.textContent = message;
}

function showLoggedInState() {
  const authGate = document.getElementById("authGate");
  const adminApp = document.getElementById("adminApp");

  if (authGate) authGate.style.display = "none";
  if (adminApp) adminApp.style.display = "block";
}

function showLoggedOutState() {
  const authGate = document.getElementById("authGate");
  const adminApp = document.getElementById("adminApp");

  if (authGate) authGate.style.display = "grid";
  if (adminApp) adminApp.style.display = "none";
}

async function applyAuthState() {
  try {
    const { data, error } = await window.supabaseClient.auth.getSession();

    if (error) {
      console.error("Auth session error:", error);
      showLoggedOutState();
      return;
    }

    if (data?.session) {
      showLoggedInState();
      await updateDashboard();
    } else {
      showLoggedOutState();
    }
  } catch (err) {
    console.error("applyAuthState error:", err);
    showLoggedOutState();
  }
}

async function signInAdmin() {
  const email = document.getElementById("login-email")?.value.trim() || "";
  const password = document.getElementById("login-password")?.value || "";

  if (!email || !password) {
    setAuthError("Email and password are required.");
    return;
  }

  setAuthError("");

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthError(error.message || "Login failed.");
      return;
    }

    if (data?.session) {
      showLoggedInState();
      await updateDashboard();
    } else {
      setAuthError("Login failed.");
    }
  } catch (err) {
    console.error("signInAdmin error:", err);
    setAuthError("Unexpected error during sign in.");
  }
}

async function signOutAdmin() {
  try {
    await window.supabaseClient.auth.signOut();
  } catch (err) {
    console.error("signOutAdmin error:", err);
  } finally {
    showLoggedOutState();
  }
}

async function updateDashboard() {
  try {
    const results = await Promise.all([
      window.supabaseClient.from("gallery").select("id", { count: "exact", head: true }),
      window.supabaseClient.from("designs").select("id", { count: "exact", head: true }),
      window.supabaseClient.from("blogs").select("id", { count: "exact", head: true }),
      window.supabaseClient.from("profile").select("skills").limit(1),
      window.supabaseClient.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false)
    ]);

    const [galleryRes, designsRes, blogsRes, profileRes, messagesRes] = results;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("stat-gallery", galleryRes.count || 0);
    setText("stat-designs", designsRes.count || 0);
    setText("stat-blog", blogsRes.count || 0);
    setText("stat-messages", messagesRes.count || 0);

    const skills = profileRes?.data?.[0]?.skills;
    setText("stat-skills", Array.isArray(skills) ? skills.length : 0);

  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

function showPage(name, buttonEl) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".sidebar-item").forEach(item => {
    item.classList.remove("active");
  });

  const target = document.getElementById(`page-${name}`);
  if (target) target.classList.add("active");

  if (buttonEl) buttonEl.classList.add("active");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("admin.js loaded");
  console.log("supabaseClient:", window.supabaseClient);

  await applyAuthState();

  const passwordInput = document.getElementById("login-password");
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") signInAdmin();
    });
  }
});

window.signInAdmin = signInAdmin;
window.signOutAdmin = signOutAdmin;
window.showPage = showPage;
window.showToast = showToast;