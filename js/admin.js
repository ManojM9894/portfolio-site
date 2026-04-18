function setAuthError(message = "") {
  const el = document.getElementById("authError");
  if (el) el.textContent = message;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
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
      showToast("Signed in successfully");
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
    showToast("Signed out");
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

  if (buttonEl) {
    buttonEl.classList.add("active");
  } else {
    document.querySelectorAll(".sidebar-item").forEach(item => {
      const onclickValue = item.getAttribute("onclick") || "";
      if (onclickValue.includes(`'${name}'`)) {
        item.classList.add("active");
      }
    });
  }

  if (name === "gallery") {
    const galleryList = document.getElementById("galleryList");
    if (galleryList && !galleryList.dataset.loaded) {
      galleryList.innerHTML = `<div class="empty"><div class="empty-icon">🎨</div><p>Gallery admin ready.</p></div>`;
      galleryList.dataset.loaded = "true";
    }
  }

  if (name === "designs") {
    const designsList = document.getElementById("designsList");
    if (designsList && !designsList.dataset.loaded) {
      designsList.innerHTML = `<div class="empty"><div class="empty-icon">🖌️</div><p>Design admin ready.</p></div>`;
      designsList.dataset.loaded = "true";
    }
  }

  if (name === "blog") {
    const blogList = document.getElementById("blogAdminList");
    if (blogList && !blogList.dataset.loaded) {
      blogList.innerHTML = `<div class="empty"><div class="empty-icon">✍️</div><p>Blog admin ready.</p></div>`;
      blogList.dataset.loaded = "true";
    }
  }

  if (name === "messages") {
    const messagesList = document.getElementById("messagesList");
    if (messagesList && !messagesList.dataset.loaded) {
      messagesList.innerHTML = `<div class="empty"><div class="empty-icon">📨</div><p>Messages panel ready.</p></div>`;
      messagesList.dataset.loaded = "true";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("admin.js loaded");
  console.log("supabaseClient:", window.supabaseClient);

  const passwordInput = document.getElementById("login-password");
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") signInAdmin();
    });
  }

  await applyAuthState();
  showPage("dashboard");
});

window.signInAdmin = signInAdmin;
window.signOutAdmin = signOutAdmin;
window.showPage = showPage;
window.showToast = showToast;