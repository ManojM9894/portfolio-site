// ==========================================
// APP.JS - PUBLIC SITE (FINAL CLEAN VERSION)
// ==========================================

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

const platformIcons = {
    Medium: '📝',
    Substack: '📧',
    Blogspot: '🌐',
    Wix: '🔷',
    Other: '✍️',
    '': '✍️'
};

let blogCache    = [];
let galleryCache = [];
let designsCache = [];
let profileCache = null;

// ==========================================
// DATA FETCHING
// ==========================================

async function fetchGallery() {
    const { data, error } = await supabaseClient
        .from('gallery')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchDesigns() {
    const { data, error } = await supabaseClient
        .from('designs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchBlogs() {
    const { data, error } = await supabaseClient
        .from('blogs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchProfile() {
    const { data, error } = await supabaseClient
        .from('profile')
        .select('*')
        .limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
}

// ==========================================
// HERO / PROFILE
// ==========================================

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first: 'Manoj', last: 'Mandava' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

function renderHeroFromProfile(profile) {
    profileCache = profile;
    if (!profile) return;

    const { first, last } = splitName(profile.name);

    const heroFirst   = document.getElementById('hero-first-name');
    const heroLast    = document.getElementById('hero-last-name');
    const heroTitle   = document.getElementById('hero-title');
    const heroTagline = document.getElementById('hero-tagline');

    if (heroFirst)   heroFirst.textContent   = first || '';
    if (heroLast)    heroLast.textContent    = last  || '';
    if (heroTitle)   heroTitle.textContent   = profile.title   || '';
    if (heroTagline) heroTagline.textContent = profile.tagline || '';
}

async function renderAbout() {
    try {
        const about = await fetchProfile();
        if (!about) return;

        renderHeroFromProfile(about);

        const nameEl   = document.getElementById('about-name');
        const bio1El   = document.getElementById('about-bio1');
        const bio2El   = document.getElementById('about-bio2');
        const skillsEl = document.getElementById('about-skills');
        const avatarEl = document.getElementById('about-avatar');

        if (nameEl)   nameEl.textContent   = about.name || '';
        if (bio1El)   bio1El.textContent   = about.bio1 || '';
        if (bio2El)   bio2El.textContent   = about.bio2 || '';

        if (avatarEl) {
            avatarEl.innerHTML = about.avatar_url
                ? `<img src="${escapeAttr(about.avatar_url)}" alt="${escapeHtml(about.name || 'Profile')}">`
                : '👤';
        }

        if (skillsEl) {
            const skills = Array.isArray(about.skills) ? about.skills : [];
            skillsEl.innerHTML = skills
                .map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
                .join('');
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

// ==========================================
// GALLERY
// ==========================================

async function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    try {
        const items = await fetchGallery();
        galleryCache = items;

        if (!items.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <p>Your artwork will appear here.<br>Upload your work via the Admin panel!</p>
                </div>`;
            return;
        }

        const loopItems = [...items, ...items, ...items];

        grid.innerHTML = `
            <div class="carousel-shell">
                <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${items.length}">
                    <div class="carousel-track">
                        ${loopItems.map(item => `
                            <div class="carousel-card">
                                <div class="carousel-image" onclick="openLightbox('${escapeAttr(item.image_url || '')}')">
                                    ${item.image_url
                                        ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || '')}">`
                                        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem">🎨</div>`}
                                    ${item.title ? `<div class="image-title-overlay"><span>${escapeHtml(item.title)}</span></div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;

        initCenterCarousels();
    } catch (error) {
        console.error('Failed to load gallery:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Failed to load gallery.</p>
            </div>`;
    }
}

// ==========================================
// DESIGNS
// ==========================================

async function renderDesigns() {
    const grid = document.getElementById('designsGrid');
    if (!grid) return;

    try {
        const items = await fetchDesigns();
        designsCache = items;

        if (!items.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🖌️</div>
                    <p>Your design projects will appear here.<br>Upload your work via the Admin panel!</p>
                </div>`;
            return;
        }

        const loopItems = [...items, ...items, ...items];

        grid.innerHTML = `
            <div class="carousel-shell">
                <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${items.length}">
                    <div class="carousel-track">
                        ${loopItems.map(item => `
                            <div class="carousel-card">
                                <div class="carousel-image" onclick="openLightbox('${escapeAttr(item.image_url || '')}')">
                                    ${item.image_url
                                        ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || '')}">`
                                        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem">🖌️</div>`}
                                    ${item.title ? `<div class="image-title-overlay"><span>${escapeHtml(item.title)}</span></div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;

        initCenterCarousels();
    } catch (error) {
        console.error('Failed to load designs:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Failed to load designs.</p>
            </div>`;
    }
}

// ==========================================
// BLOG
// ==========================================

async function renderBlog() {
    const list = document.getElementById('blogList');
    if (!list) return;
    try {
        const items = await fetchBlogs();
        blogCache = items;
        if (!items.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✍️</div><p>Articles coming soon!</p></div>`;
            return;
        }

        const loop = items.length < 4 ? [...items, ...items, ...items] : [...items, ...items];

        list.innerHTML = `
            <div class="carousel-shell">
                <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${items.length}">
                    <div class="carousel-track">
                        ${loop.map(item => `
                            <div class="blog-carousel-card">
                                <div class="blog-scroll-meta">
                                    ${platformIcons[item.platform] || '✍️'}
                                    ${escapeHtml(item.category || '')}${item.category ? ' · ' : ''}
                                    ${escapeHtml(item.post_date || '')}
                                    ${item.platform ? ' · ' + escapeHtml(item.platform) : ''}
                                </div>
                                <div class="blog-scroll-title">${escapeHtml(item.title || '')}</div>
                                <div class="blog-scroll-excerpt">${escapeHtml(item.excerpt || '')}</div>
                                <div style="display:flex;gap:0.8rem;margin-top:1rem;flex-wrap:wrap">
                                    ${item.content
                                        ? `<button class="btn-ghost" style="padding:0.45rem 1rem;font-size:0.8rem" onclick="openBlogReader(${item.id})">Read Post →</button>`
                                        : ''}
                                    ${item.url
                                        ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="padding:0.45rem 1rem;font-size:0.8rem">Read on ${escapeHtml(item.platform || 'External')} →</a>`
                                        : ''}
                                </div>
                            </div>`).join('')}
                    </div>
                </div>
            </div>`;

        initCenterCarousels();
    } catch(e) {
        console.error('Blog error:', e);
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Failed to load blog.</p></div>`;
    }
}

// ==========================================
// RECENT WORKS
// ==========================================

function renderRecentWorks() {
    const container = document.getElementById('recentWorksGrid');
    if (!container) return;

    const merged = [
        ...galleryCache.map(item => ({ ...item, type: 'gallery' })),
        ...designsCache.map(item => ({ ...item, type: 'designs' })),
        ...blogCache.map(item => ({ ...item, type: 'blog' }))
    ]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    if (!merged.length) {
        container.innerHTML = `<div class="empty-state"><p>No recent works yet.</p></div>`;
        return;
    }

    const loopItems = [...merged, ...merged, ...merged];

    container.innerHTML = `
        <div class="carousel-shell">
            <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${merged.length}">
                <div class="recent-works-track">
                    ${loopItems.map(item => {
                        if (item.type === 'blog') {
                            return `
                                <div class="recent-work-card">
                                    <div class="recent-work-image"
                                        style="display:flex;align-items:flex-end;padding:1rem;background:var(--surface);cursor:pointer"
                                        onclick="openBlogReader(${item.id})">
                                        ${item.title ? `<div class="image-title-overlay"><span>${escapeHtml(item.title)}</span></div>` : ''}
                                    </div>
                                </div>`;
                        }
                        return `
                            <div class="recent-work-card">
                                <div class="recent-work-image" onclick="openLightbox('${escapeAttr(item.image_url || '')}')">
                                    ${item.image_url
                                        ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || '')}">`
                                        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem">${item.type === 'gallery' ? '🎨' : '🖌️'}</div>`}
                                    ${item.title ? `<div class="image-title-overlay"><span>${escapeHtml(item.title)}</span></div>` : ''}
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

    initCenterCarousels();
}

// ==========================================
// COLLECTION MODAL
// ==========================================
const collectionRenderState = {
    type: '',
    limit: 20
};

function getCollectionItems(type) {
    if (type === 'gallery') return galleryCache || [];
    if (type === 'designs') return designsCache || [];
    if (type === 'blog') return blogCache || [];
    return [];
}

function renderCollectionModalContent(type) {
    const title = document.getElementById('collectionModalTitle');
    const content = document.getElementById('collectionModalContent');
    if (!title || !content) return;

    const allItems = getCollectionItems(type);
    const visibleItems = allItems.slice(0, collectionRenderState.limit);

    content.className = 'collection-modal-content';
    if (type === 'blog') {
        content.classList.add('blog-collection-grid');
    }

    if (type === 'gallery') {
        title.textContent = 'All Artworks';

        content.innerHTML = visibleItems.length
            ? visibleItems.map(item => `
                <div class="collection-grid-card">
                    ${item.image_url ? `
                        <img
                            loading="lazy"
                            src="${escapeAttr(item.image_url)}"
                            alt="${escapeHtml(item.title || '')}"
                            onclick="openLightbox('${escapeAttr(item.image_url)}')"
                            style="opacity:0;transition:opacity 0.25s ease"
                            onload="this.style.opacity='1'"
                        >
                    ` : ''}
                    <div class="collection-grid-info">
                        ${item.title ? `<strong style="color:#fff">${escapeHtml(item.title)}</strong>` : ''}
                        ${item.description ? `<div style="margin-top:0.4rem">${escapeHtml(item.description)}</div>` : ''}
                    </div>
                </div>
            `).join('')
            : `<div class="empty-state" style="grid-column:1/-1"><p>No artworks yet.</p></div>`;
    }

    else if (type === 'designs') {
        title.textContent = 'All Designs';

        content.innerHTML = visibleItems.length
            ? visibleItems.map(item => `
                <div class="collection-grid-card">
                    ${item.image_url ? `
                        <img
                            loading="lazy"
                            src="${escapeAttr(item.image_url)}"
                            alt="${escapeHtml(item.title || '')}"
                            onclick="openLightbox('${escapeAttr(item.image_url)}')"
                            style="opacity:0;transition:opacity 0.25s ease"
                            onload="this.style.opacity='1'"
                        >
                    ` : ''}
                    <div class="collection-grid-info">
                        ${item.title ? `<strong style="color:#fff">${escapeHtml(item.title)}</strong>` : ''}
                        ${item.description ? `<div style="margin-top:0.4rem">${escapeHtml(item.description)}</div>` : ''}
                    </div>
                </div>
            `).join('')
            : `<div class="empty-state" style="grid-column:1/-1"><p>No designs yet.</p></div>`;
    }

    else if (type === 'blog') {
        title.textContent = 'All Blog Posts';

        content.innerHTML = visibleItems.length
            ? visibleItems.map(item => `
                <div class="collection-blog-card">
                    <div class="collection-blog-meta">
                        ${escapeHtml(item.category || 'Blog')}
                        ${item.post_date ? ' · ' + escapeHtml(item.post_date) : ''}
                        ${item.platform ? ' · ' + escapeHtml(item.platform) : ''}
                    </div>
                    <div class="collection-blog-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="collection-blog-excerpt">${escapeHtml(item.excerpt || '')}</div>
                    <div class="collection-blog-actions">
                        ${item.content ? `
                            <button class="collection-blog-btn" onclick="openBlogReaderFromCollection(${item.id})">
                                Read Post
                            </button>
                        ` : ''}
                        ${item.url ? `
                            <a class="collection-blog-btn" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">
                                Open Link
                            </a>
                        ` : ''}
                    </div>
                </div>
            `).join('')
            : `<div class="empty-state" style="grid-column:1/-1"><p>No blog posts yet.</p></div>`;
    }

    if (allItems.length > collectionRenderState.limit) {
        content.innerHTML += `
            <div class="collection-load-more-wrap">
                <button type="button" class="collection-load-more-btn" onclick="loadMoreCollectionItems()">
                    Load More
                </button>
            </div>
        `;
    }
}

function openCollectionModal(type) {
    const modal = document.getElementById('collectionModal');
    const title = document.getElementById('collectionModalTitle');
    const content = document.getElementById('collectionModalContent');

    if (!modal || !title || !content) {
        console.error('Collection modal elements not found');
        return;
    }

    collectionRenderState.type = type;
    collectionRenderState.limit = 20;

    renderCollectionModalContent(type);

    modal.classList.add('open');
    document.body.classList.add('modal-open');

    document.querySelectorAll('.center-carousel').forEach(el => {
        el.style.pointerEvents = 'none';
    });
}

function loadMoreCollectionItems() {
    if (!collectionRenderState.type) return;
    collectionRenderState.limit += 20;
    renderCollectionModalContent(collectionRenderState.type);
}

function closeCollectionModal() {
    const modal = document.getElementById('collectionModal');
    const content = document.getElementById('collectionModalContent');

    if (modal) modal.classList.remove('open');

    if (content) {
        content.innerHTML = '';
        content.scrollTop = 0;
        content.className = 'collection-modal-content';
    }

    collectionRenderState.type = '';
    collectionRenderState.limit = 20;

    document.body.classList.remove('modal-open');

    document.querySelectorAll('.center-carousel').forEach(el => {
        el.style.pointerEvents = '';
    });
}

function openBlogReaderFromCollection(id) {
    closeCollectionModal();
    setTimeout(() => openBlogReader(id), 180);
}

function openBlogReaderFromModal(id) {
    openBlogReaderFromCollection(id);
}

// ==========================================
// ADMIN MENU
// ==========================================

function initAdminMenu() {
    const adminMenuBtn  = document.getElementById('adminMenuBtn');
    const adminDropdown = document.getElementById('adminDropdown');
    const openAdminBtn  = document.getElementById('openAdminBtn');

    if (adminMenuBtn && adminDropdown) {
        adminMenuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            adminDropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            adminDropdown.classList.remove('open');
        });
    }

    if (openAdminBtn) {
        openAdminBtn.addEventListener('click', () => {
            window.open('./admin.html', '_blank', 'noopener,noreferrer');
        });
    }
}

// ==========================================
// NAVIGATION
// ==========================================

function initNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu   = document.querySelector('.nav-links');
    const navLinks  = document.querySelectorAll('.nav-links a');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('open');
        });
    });

    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) link.classList.add('active');
        });
    });
}

// ==========================================
// LIGHTBOX + MODAL INIT
// ==========================================

function initLightbox() {
    const lightboxEl = document.getElementById('lightbox');
    if (lightboxEl) {
        lightboxEl.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeLightbox();
        });
    }

    const blogModal = document.getElementById('blogReaderModal');
    if (blogModal) {
        blogModal.addEventListener('click', (e) => {
            if (e.target === blogModal) closeBlogReader();
        });
    }

    const collectionModal = document.getElementById('collectionModal');
    if (collectionModal) {
        collectionModal.querySelector('.collection-modal-backdrop')
            ?.addEventListener('click', closeCollectionModal);
    }
}

// ==========================================
// CONTACT FORM
// ==========================================

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn          = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML      = 'Sending... ⏳';
        btn.disabled       = true;

        const inputs  = contactForm.querySelectorAll('input, textarea');
        const name    = inputs[0]?.value.trim() || '';
        const email   = inputs[1]?.value.trim() || '';
        const subject = inputs[2]?.value.trim() || '';
        const message = inputs[3]?.value.trim() || '';

        if (!name || !email || !message) {
            showToast('⚠️ Please fill in all required fields.');
            btn.innerHTML = originalText;
            btn.disabled  = false;
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('messages')
                .insert([{ name, email, subject, message }]);

            if (error) throw error;

            showToast('✅ Message sent! I will get back to you soon.');
            contactForm.reset();

        } catch (err) {
            console.error('Message error:', err);
            showToast('❌ Failed to send. Please email directly.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled  = false;
        }
    });
}

// ==========================================
// TOAST
// ==========================================

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await renderGallery();
        await renderDesigns();
        await renderBlog();
        await renderAbout();
        renderRecentWorks();
    } catch (error) {
        console.error('Initial render failed:', error);
    }

    initNav();
    initAdminMenu();
    initLightbox();
    initContactForm();
});
async function submitContactMessage(event) {
    event.preventDefault();

    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;

    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const subject = document.getElementById('contact-subject').value.trim();
        const message = document.getElementById('contact-message').value.trim();

        const { error } = await supabaseClient
            .from('messages')
            .insert([{ name, email, subject, message, is_read: false }]);

        if (error) throw error;

        document.getElementById('contactForm').reset();
        showToast('✅ Message sent successfully!');
    } catch (err) {
        console.error(err);
        showToast('❌ Failed to send message');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ==========================================
// GLOBALS FOR INLINE HTML
// ==========================================

window.openCollectionModal  = openCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.submitContactMessage = submitContactMessage;
window.openCollectionModal = openCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.loadMoreCollectionItems = loadMoreCollectionItems;
window.openBlogReaderFromCollection = openBlogReaderFromCollection;
window.openBlogReaderFromModal = openBlogReaderFromModal;