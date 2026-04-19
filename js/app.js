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
/* ==========================================
   CAROUSEL
========================================== */
function initCenterCarousels() {
    const wraps = document.querySelectorAll('.center-carousel');

    wraps.forEach((wrap) => {
        if (wrap.dataset.carouselInit === 'true') return;
        wrap.dataset.carouselInit = 'true';

        const track = wrap.querySelector('.carousel-track, .recent-works-track');
        if (!track) return;

        const cards = [...track.children];
        if (!cards.length) return;

        const originalCount = Number(
            wrap.dataset.originalCount || Math.floor(cards.length / 3) || cards.length
        );

        const gap = parseFloat(getComputedStyle(track).gap || '0');
        const firstCard = cards[0];
        const unitWidth = firstCard.offsetWidth + gap;
        const setWidth = unitWidth * originalCount;

        let position = 0;
        let velocity = 0.45;
        let isDragging = false;
        let startX = 0;
        let dragStartPosition = 0;

        wrap.style.overflow = 'hidden';
        track.style.willChange = 'transform';
        track.style.transform = 'translate3d(0,0,0)';

        function applyDockEffect() {
            const wrapRect = wrap.getBoundingClientRect();
            const centerX = wrapRect.left + wrapRect.width / 2;
            const visibleCards = track.querySelectorAll(
                '.carousel-card, .blog-carousel-card, .recent-work-card'
            );

            visibleCards.forEach((card) => {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const dist = Math.abs(centerX - cardCenter);
                const maxDist = wrapRect.width * 0.5;
                const ratio = Math.min(dist / maxDist, 1);

                const scale = 1.06 - ratio * 0.24;
                const lift = (1 - ratio) * 8;
                const opacity = 1 - ratio * 0.35;

                card.style.transform = `translateY(${-lift}px) scale(${scale})`;
                card.style.opacity = `${opacity}`;
                card.classList.toggle('is-active', ratio < 0.16);
            });
        }

        function normalizeLoop() {
            while (position <= -setWidth) position += setWidth;
            while (position > 0) position -= setWidth;
        }

        function render() {
            normalizeLoop();
            track.style.transform = `translate3d(${position}px, 0, 0)`;
            applyDockEffect();
        }

        function animate() {
            if (!isDragging) {
                position -= velocity;
                velocity *= 0.985;
                if (Math.abs(velocity) < 0.45) velocity = 0.45;
            }
            render();
            requestAnimationFrame(animate);
        }

        function addImpulse(delta) {
            velocity += delta;
            if (velocity > 18) velocity = 18;
            if (velocity < -18) velocity = -18;
        }

        wrap.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                const delta = e.deltaY || e.deltaX;
                position -= delta * 0.9;
                addImpulse(delta * 0.015);
                render();
            },
            { passive: false }
        );

        wrap.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            dragStartPosition = position;
            wrap.classList.add('is-dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            position = dragStartPosition + (e.clientX - startX);
            render();
        });

        window.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            isDragging = false;
            wrap.classList.remove('is-dragging');
            addImpulse(-(dx * 0.02));
        });

        wrap.addEventListener(
            'touchstart',
            (e) => {
                if (!e.touches[0]) return;
                isDragging = true;
                startX = e.touches[0].clientX;
                dragStartPosition = position;
            },
            { passive: true }
        );

        wrap.addEventListener(
            'touchmove',
            (e) => {
                if (!isDragging || !e.touches[0]) return;
                position = dragStartPosition + (e.touches[0].clientX - startX);
                render();
            },
            { passive: true }
        );

        wrap.addEventListener('touchend', () => {
            isDragging = false;
        });

        window.addEventListener('resize', () => {
            render();
        });

        render();
        requestAnimationFrame(animate);
    });
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
// ==========================================
// BLOG READER
// ==========================================

function openBlogReader(id) {
    const post = blogCache.find(item => Number(item.id) === Number(id));
    if (!post) return;

    const modal      = document.getElementById('blogReaderModal');
    const titleEl    = document.getElementById('readerModalTitle');
    const metaEl     = document.getElementById('readerModalMeta');
    const contentEl  = document.getElementById('readerModalContent');
    const externalEl = document.getElementById('readerModalExternal');

    if (titleEl) titleEl.textContent = post.title || 'Blog Post';
    if (metaEl) {
        const parts = [];
        if (post.category)  parts.push(post.category);
        if (post.post_date) parts.push(post.post_date);
        if (post.platform)  parts.push(post.platform);
        metaEl.textContent = parts.join(' · ');
    }
    if (contentEl)  contentEl.innerHTML  = post.content || '<p>No content available.</p>';
    if (externalEl) externalEl.innerHTML = post.url
        ? `<a href="${post.url}" target="_blank" rel="noopener" class="btn-ghost" style="font-size:0.85rem">Also on ${post.platform || 'External'} →</a>`
        : '';

    if (modal) {
        modal.style.display = 'block';
        modal.scrollTop = 0;
        document.body.style.overflow = 'hidden';
    }
}

function closeBlogReader() {
    const modal = document.getElementById('blogReaderModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function openBlogReaderFromModal(id) {
    closeCollectionModal();
    setTimeout(() => openBlogReader(id), 300);
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
/* ==========================================
   APPLE-STYLE FLOATING GLASS NAV
========================================== */
function initNavbarScrollEffect() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    nav.classList.add('nav-glass', 'nav-fade-in');

    let ticking = false;
    let lastY = window.scrollY;

    function updateNav() {
        const y = window.scrollY;

        if (y > 24) {
            nav.classList.add('nav-scrolled');
        } else {
            nav.classList.remove('nav-scrolled');
        }

        if (y > lastY && y > 80) {
            nav.classList.add('nav-fade-out');
            nav.classList.remove('nav-fade-in');
        } else {
            nav.classList.add('nav-fade-in');
            nav.classList.remove('nav-fade-out');
        }

        lastY = y;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateNav);
            ticking = true;
        }
    }, { passive: true });

    updateNav();
}

// ==========================================
// LIGHTBOX + MODAL INIT
// ==========================================
// ==========================================
// LIGHTBOX
// ==========================================

function openLightbox(src) {
    if (!src) return;
    const lightbox = document.getElementById('lightbox');
    const img      = document.getElementById('lightboxImg');
    if (!lightbox || !img) return;
    img.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

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

// ==========================================
// NAVIGATION
// ==========================================

function initNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu   = document.querySelector('.nav-links');
    const navLinks  = document.querySelectorAll('.nav-links a');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => navMenu.classList.toggle('open'));
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => navMenu?.classList.remove('open'));
    });

    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        let current = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    });
}

function initAdminMenu() {
    const btn      = document.getElementById('adminMenuBtn');
    const dropdown = document.getElementById('adminDropdown');
    const openBtn  = document.getElementById('openAdminBtn');

    if (btn && dropdown) {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
    if (openBtn) {
        openBtn.addEventListener('click', () =>
            window.open('https://manojm9894.github.io/portfolio-site/admin.html', '_blank', 'noopener,noreferrer'));
    }
}

function initModals() {
    document.getElementById('lightbox')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeLightbox();
    });
    document.getElementById('blogReaderModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeBlogReader();
    });
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = form.querySelector('button[type="submit"]');
        const orig = btn.innerHTML;
        btn.innerHTML = 'Sending... ⏳';
        btn.disabled  = true;
        const inputs  = form.querySelectorAll('input, textarea');
        const name    = inputs[0]?.value.trim() || '';
        const email   = inputs[1]?.value.trim() || '';
        const subject = inputs[2]?.value.trim() || '';
        const message = inputs[3]?.value.trim() || '';
        if (!name || !email || !message) {
            showToast('⚠️ Please fill in all required fields.');
            btn.innerHTML = orig;
            btn.disabled  = false;
            return;
        }
        try {
            const { error } = await supabaseClient.from('messages').insert([{ name, email, subject, message }]);
            if (error) throw error;
            showToast('✅ Message sent!');
            form.reset();
        } catch(err) {
            showToast('❌ Failed to send. Please email directly.');
        } finally {
            btn.innerHTML = orig;
            btn.disabled  = false;
        }
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    initNavbarScrollEffect();
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
// ==========================================
// GLOBALS
// ==========================================
window.openLightbox            = openLightbox;
window.closeLightbox           = closeLightbox;
window.openBlogReader          = openBlogReader;
window.closeBlogReader         = closeBlogReader;
window.openCollectionModal     = openCollectionModal;
window.closeCollectionModal    = closeCollectionModal;
window.openBlogReaderFromModal = openBlogReaderFromModal;
window.submitContactMessage    = submitContactMessage;