const galleryCache = [];
const designsCache = [];
const blogCache = [];

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (!lightbox || !img || !src) return;
    img.src = src;
    lightbox.classList.add('active');
}

function openCollectionModal(type) {
    showToast(`Open ${type} collection`);
}

function closeCollectionModal() {
    const modal = document.getElementById('collectionModal');
    if (modal) modal.classList.remove('open');
}

function closeBlogReader() {
    const modal = document.getElementById('blogReaderModal');
    if (modal) modal.style.display = 'none';
}

async function submitContactMessage(event) {
    event.preventDefault();
    showToast('Message form connected. Supabase wiring comes next.');
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', submitContactMessage);

    const adminBtn = document.getElementById('adminMenuBtn');
    const adminDropdown = document.getElementById('adminDropdown');

    if (adminBtn && adminDropdown) {
        adminBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            adminDropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            adminDropdown.classList.remove('open');
        });
    }

    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }
});