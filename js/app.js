function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

const platformIcons = {
    Medium: "📝",
    Substack: "📧",
    Blogspot: "🌐",
    Wix: "🔷",
    Other: "✍️",
    "": "✍️"
};

const galleryCache = [];
const designsCache = [];
let blogCache = [];
let profileCache = null;

const collectionRenderState = {
    type: "",
    limit: 20
};

let collectionTouchStartY = 0;
let collectionTouchEndY = 0;

let lightboxImages = [];
let lightboxIndex = 0;
let lightboxScale = 1;
let lightboxTranslateX = 0;
let lightboxTranslateY = 0;
let lightboxStartDistance = 0;
let lightboxStartScale = 1;
let lightboxPanStartX = 0;
let lightboxPanStartY = 0;
let lightboxTouchStartX = 0;
let lightboxTouchEndX = 0;

async function fetchGallery() {
    const { data, error } = await supabaseClient
        .from("gallery")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchDesigns() {
    const { data, error } = await supabaseClient
        .from("designs")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchBlogs() {
    const { data, error } = await supabaseClient
        .from("blogs")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchProfile() {
    const { data, error } = await supabaseClient
        .from("profile")
        .select("*")
        .limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
}

function splitName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first: "Manoj", last: "Mandava" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
}

function renderHeroFromProfile(profile) {
    profileCache = profile;
    if (!profile) return;

    const { first, last } = splitName(profile.name);
    const heroFirst = document.getElementById("hero-first-name");
    const heroLast = document.getElementById("hero-last-name");
    const heroTitle = document.getElementById("hero-title");
    const heroTagline = document.getElementById("hero-tagline");

    if (heroFirst) heroFirst.textContent = first || "";
    if (heroLast) heroLast.textContent = last || "";
    if (heroTitle) heroTitle.textContent = profile.title || "";
    if (heroTagline) heroTagline.textContent = profile.tagline || "";
}

async function renderAbout() {
    try {
        const about = await fetchProfile();
        if (!about) return;

        renderHeroFromProfile(about);

        const nameEl = document.getElementById("about-name");
        const bio1El = document.getElementById("about-bio1");
        const bio2El = document.getElementById("about-bio2");
        const skillsEl = document.getElementById("about-skills");
        const avatarEl = document.getElementById("about-avatar");

        if (nameEl) nameEl.textContent = about.name || "";
        if (bio1El) bio1El.textContent = about.bio1 || "";
        if (bio2El) bio2El.textContent = about.bio2 || "";

        if (avatarEl) {
            avatarEl.innerHTML = about.avatar_url
                ? `<img src="${escapeAttr(about.avatar_url)}" alt="${escapeHtml(about.name || "Profile")}">`
                : "👤";
        }

        if (skillsEl) {
            const skills = Array.isArray(about.skills) ? about.skills : [];
            skillsEl.innerHTML = skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("");
        }
    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

function buildGalleryCard(item) {
    const imageUrl = item?.image_url || "";
    const title = item?.title || "";

    return `
        <div class="carousel-card">
            <div class="carousel-image" onclick="openGalleryLightbox('${escapeAttr(imageUrl)}')">
                ${imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">` : `<div class="empty-state"><div class="empty-state-icon">🎨</div></div>`}
                ${title ? `<div class="image-title-overlay"><span>${escapeHtml(title)}</span></div>` : ""}
            </div>
        </div>
    `;
}

function buildDesignCard(item) {
    const imageUrl = item?.image_url || "";
    const title = item?.title || "";

    return `
        <div class="carousel-card">
            <div class="carousel-image" onclick="openDesignLightbox('${escapeAttr(imageUrl)}')">
                ${imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">` : `<div class="empty-state"><div class="empty-state-icon">🖌️</div></div>`}
                ${title ? `<div class="image-title-overlay"><span>${escapeHtml(title)}</span></div>` : ""}
            </div>
        </div>
    `;
}

function initCenterCarousels() {
    const wraps = document.querySelectorAll(".center-carousel");

    wraps.forEach((wrap) => {
        if (wrap.dataset.carouselInit === "true") return;
        wrap.dataset.carouselInit = "true";

        const track = wrap.querySelector(".carousel-track, .recent-works-track");
        if (!track) return;

        const cards = [...track.children];
        if (!cards.length) return;

        const originalCount = Number(wrap.dataset.originalCount || Math.floor(cards.length / 3) || cards.length);
        const gap = parseFloat(getComputedStyle(track).gap || "0");
        const firstCard = cards[0];
        const unitWidth = firstCard.offsetWidth + gap;
        const setWidth = unitWidth * originalCount;

        let position = 0;
        let velocity = 0.45;
        let isDragging = false;
        let startX = 0;
        let dragStartPosition = 0;

        wrap.style.touchAction = "pan-y";
        wrap.style.overflow = "hidden";
        track.style.willChange = "transform";

        function applyDockEffect() {
            const wrapRect = wrap.getBoundingClientRect();
            const centerX = wrapRect.left + wrapRect.width / 2;
            const visibleCards = track.querySelectorAll(".carousel-card, .blog-carousel-card, .recent-work-card");

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
                card.classList.toggle("is-active", ratio < 0.16);
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

        wrap.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY || e.deltaX;
            position -= delta * 0.9;
            addImpulse(delta * 0.015);
            render();
        }, { passive: false });

        wrap.addEventListener("mousedown", (e) => {
            isDragging = true;
            startX = e.clientX;
            dragStartPosition = position;
            wrap.classList.add("is-dragging");
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            position = dragStartPosition + (e.clientX - startX);
            render();
        });

        window.addEventListener("mouseup", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            isDragging = false;
            wrap.classList.remove("is-dragging");
            addImpulse(-(dx * 0.02));
        });

        wrap.addEventListener("touchstart", (e) => {
            if (!e.touches[0]) return;
            isDragging = true;
            startX = e.touches[0].clientX;
            dragStartPosition = position;
            velocity = 0;
        }, { passive: true });

        wrap.addEventListener("touchmove", (e) => {
            if (!isDragging || !e.touches[0]) return;
            const dx = e.touches[0].clientX - startX;
            position = dragStartPosition + dx;
            render();
        }, { passive: true });

        wrap.addEventListener("touchend", (e) => {
            if (!isDragging) return;
            const endX = e.changedTouches?.[0]?.clientX ?? startX;
            const dx = endX - startX;
            isDragging = false;
            addImpulse(-(dx * 0.04));
        });

        window.addEventListener("resize", render);
        render();
        requestAnimationFrame(animate);
    });
}

async function renderGallery() {
    const container = document.getElementById("galleryGrid");
    if (!container) return;

    try {
        const items = await fetchGallery();
        galleryCache.length = 0;
        galleryCache.push(...items);

        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎨</div><p>No artworks yet.</p></div>`;
            return;
        }

        const repeated = [...items, ...items, ...items];
        container.innerHTML = `
            <div class="carousel-shell">
                <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${items.length}">
                    <div class="carousel-track">${repeated.map(buildGalleryCard).join("")}</div>
                </div>
            </div>
        `;

        initCenterCarousels();
    } catch (error) {
        console.error("Failed to load gallery:", error);
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Failed to load gallery.</p></div>`;
    }
}

async function renderDesigns() {
    const container = document.getElementById("designsGrid");
    if (!container) return;

    try {
        const items = await fetchDesigns();
        designsCache.length = 0;
        designsCache.push(...items);

        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🖌️</div><p>No designs yet.</p></div>`;
            return;
        }

        const repeated = [...items, ...items, ...items];
        container.innerHTML = `
            <div class="carousel-shell">
                <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${items.length}">
                    <div class="carousel-track">${repeated.map(buildDesignCard).join("")}</div>
                </div>
            </div>
        `;

        initCenterCarousels();
    } catch (error) {
        console.error("Failed to load designs:", error);
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Failed to load designs.</p></div>`;
    }
}

async function renderBlog() {
    const list = document.getElementById("blogList");
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
                        ${loop.map((item) => `
                            <div class="blog-carousel-card">
                                <div class="blog-scroll-meta">
                                    ${platformIcons[item.platform] || "✍️"}
                                    ${escapeHtml(item.category || "")}${item.category ? " · " : ""}
                                    ${escapeHtml(item.post_date || "")}
                                    ${item.platform ? " · " + escapeHtml(item.platform) : ""}
                                </div>
                                <div class="blog-scroll-title">${escapeHtml(item.title || "")}</div>
                                <div class="blog-scroll-excerpt">${escapeHtml(item.excerpt || "")}</div>
                                <div style="display:flex;gap:0.8rem;margin-top:1rem;flex-wrap:wrap">
                                    ${item.content ? `<button class="btn-ghost" style="padding:0.45rem 1rem;font-size:0.8rem" onclick="openBlogReader(${item.id})">Read Post →</button>` : ""}
                                    ${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="padding:0.45rem 1rem;font-size:0.8rem">Read on ${escapeHtml(item.platform || "External")} →</a>` : ""}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;

        initCenterCarousels();
    } catch (error) {
        console.error("Blog error:", error);
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Failed to load blog.</p></div>`;
    }
}

function renderRecentWorks() {
    const container = document.getElementById("recentWorksGrid");
    if (!container) return;

    const merged = [
        ...galleryCache.map((item) => ({ ...item, type: "gallery" })),
        ...designsCache.map((item) => ({ ...item, type: "designs" })),
        ...blogCache.map((item) => ({ ...item, type: "blog" }))
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8);

    if (!merged.length) {
        container.innerHTML = `<div class="empty-state"><p>No recent works yet.</p></div>`;
        return;
    }

    const loopItems = [...merged, ...merged, ...merged];
    container.innerHTML = `
        <div class="carousel-shell">
            <div class="carousel-wrap center-carousel infinite-carousel" data-original-count="${merged.length}">
                <div class="recent-works-track">
                    ${loopItems.map((item) => {
                        if (item.type === "blog") {
                            const blogColors = {
                                story: ["#1a0800", "#7c2d00"],
                                thoughts: ["#1a0a00", "#92400e"],
                                tech: ["#150800", "#6b2a00"],
                                art: ["#1a0800", "#9a3412"],
                                life: ["#120800", "#7c2d00"],
                                default: ["#120600", "#6b2100"]
                            };
                            const cat = item.category?.toLowerCase() || "default";
                            const [c1, c2] = blogColors[cat] || blogColors.default;
                            return `
                                <div class="recent-work-card">
                                    <div class="recent-work-image" onclick="openBlogReader(${item.id})" style="cursor:pointer;background:linear-gradient(135deg,${c1} 0%,${c2} 100%);display:flex;flex-direction:column;justify-content:space-between;padding:1.2rem;position:relative;overflow:hidden;">
                                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:8rem;font-weight:900;color:rgba(255,255,255,0.04);pointer-events:none;line-height:1;letter-spacing:-0.05em;user-select:none;">M</div>
                                        <div style="display:flex;justify-content:space-between;align-items:center;z-index:1;">
                                            <span style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(255,255,255,0.45);font-weight:600;">${escapeHtml(item.category || "writing")}</span>
                                            <span style="font-size:0.65rem;color:rgba(255,255,255,0.3);">${item.post_date || ""}</span>
                                        </div>
                                        <div style="z-index:1;">
                                            <div style="font-size:1rem;font-weight:700;color:#fff;line-height:1.3;letter-spacing:-0.02em;margin-bottom:0.4rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(item.title || "")}</div>
                                            ${item.excerpt ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.45);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(item.excerpt)}</div>` : ""}
                                            <div style="margin-top:0.8rem;font-size:0.7rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Read →</div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        const clickHandler = item.type === "gallery"
                            ? `openGalleryLightbox('${escapeAttr(item.image_url || "")}')`
                            : `openDesignLightbox('${escapeAttr(item.image_url || "")}')`;

                        return `
                            <div class="recent-work-card">
                                <div class="recent-work-image" onclick="${clickHandler}">
                                    ${item.image_url ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || "")}">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem">${item.type === "gallery" ? "🎨" : "🖌️"}</div>`}
                                    ${item.title ? `<div class="image-title-overlay"><span>${escapeHtml(item.title)}</span></div>` : ""}
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </div>
    `;

    initCenterCarousels();
}

function getCollectionItems(type) {
    if (type === "gallery") return galleryCache || [];
    if (type === "designs") return designsCache || [];
    if (type === "blog") return blogCache || [];
    return [];
}

function buildCollectionLoadMore(type, allItems) {
    if (allItems.length <= collectionRenderState.limit) return "";
    return `
        <div class="collection-load-more-wrap">
            <button class="collection-load-more-btn" onclick="loadMoreCollectionItems()">
                Load More ${escapeHtml(type)}
            </button>
        </div>
    `;
}

function renderCollectionModalContent(type) {
    const title = document.getElementById("collectionModalTitle");
    const content = document.getElementById("collectionModalContent");
    if (!title || !content) return;

    const allItems = getCollectionItems(type);
    const visibleItems = allItems.slice(0, collectionRenderState.limit);
    content.className = "collection-modal-content";

    if (type === "gallery") {
        title.textContent = "All Artworks";
        content.innerHTML = visibleItems.length
            ? `
                ${visibleItems.map((item) => `
                    <div class="collection-grid-card">
                        ${item.image_url ? `<img loading="lazy" src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || "")}" onclick="openGalleryLightbox('${escapeAttr(item.image_url)}')">` : ""}
                        <div class="collection-grid-info">
                            ${item.title ? `<strong>${escapeHtml(item.title)}</strong>` : ""}
                            ${item.description ? `<div>${escapeHtml(item.description)}</div>` : ""}
                        </div>
                    </div>
                `).join("")}
                ${buildCollectionLoadMore("artworks", allItems)}
            `
            : `<div class="empty-state" style="grid-column:1/-1"><p>No artworks yet.</p></div>`;
    } else if (type === "designs") {
        title.textContent = "All Designs";
        content.innerHTML = visibleItems.length
            ? `
                ${visibleItems.map((item) => `
                    <div class="collection-grid-card">
                        ${item.image_url ? `<img loading="lazy" src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.title || "")}" onclick="openDesignLightbox('${escapeAttr(item.image_url)}')">` : ""}
                        <div class="collection-grid-info">
                            ${item.title ? `<strong>${escapeHtml(item.title)}</strong>` : ""}
                            ${item.description ? `<div>${escapeHtml(item.description)}</div>` : ""}
                        </div>
                    </div>
                `).join("")}
                ${buildCollectionLoadMore("designs", allItems)}
            `
            : `<div class="empty-state" style="grid-column:1/-1"><p>No designs yet.</p></div>`;
    } else if (type === "blog") {
        title.textContent = "All Blog Posts";
        content.className = "collection-modal-content blog-collection-grid";
        content.innerHTML = visibleItems.length
            ? `
                ${visibleItems.map((item) => `
                    <div class="collection-blog-card">
                        <div class="collection-blog-meta">
                            ${escapeHtml(item.category || "")}${item.category && item.post_date ? " · " : ""}${escapeHtml(item.post_date || "")}
                        </div>
                        <div class="collection-blog-title">${escapeHtml(item.title || "Untitled")}</div>
                        ${item.excerpt ? `<div class="collection-blog-excerpt">${escapeHtml(item.excerpt)}</div>` : ""}
                        <div class="collection-blog-actions">
                            ${item.content ? `<button class="collection-blog-btn" onclick="openBlogReaderFromCollection(${item.id})">Read Post</button>` : ""}
                            ${item.url ? `<a class="collection-blog-btn" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ""}
                        </div>
                    </div>
                `).join("")}
                ${buildCollectionLoadMore("posts", allItems)}
            `
            : `<div class="empty-state" style="grid-column:1/-1"><p>No blog posts yet.</p></div>`;
    }
}

function initCollectionModalSwipe() {
    const panel = document.querySelector(".collection-modal-panel");
    const content = document.getElementById("collectionModalContent");
    if (!panel || panel.dataset.swipeInit === "true") return;
    panel.dataset.swipeInit = "true";

    panel.addEventListener("touchstart", (e) => {
        if (!e.touches[0]) return;
        collectionTouchStartY = e.touches[0].clientY;
        collectionTouchEndY = e.touches[0].clientY;
    }, { passive: true });

    panel.addEventListener("touchmove", (e) => {
        if (!e.touches[0]) return;
        collectionTouchEndY = e.touches[0].clientY;
    }, { passive: true });

    panel.addEventListener("touchend", () => {
        const deltaY = collectionTouchEndY - collectionTouchStartY;
        const nearTop = !content || content.scrollTop <= 4;
        if (deltaY > 90 && nearTop && window.innerWidth <= 768) {
            closeCollectionModal();
        }
    });
}

function openCollectionModal(type) {
    const modal = document.getElementById("collectionModal");
    const content = document.getElementById("collectionModalContent");
    if (!modal || !content) return;

    collectionRenderState.type = type;
    collectionRenderState.limit = 20;
    renderCollectionModalContent(type);
    initCollectionModalSwipe();
    content.scrollTop = 0;
    modal.classList.add("open");
    document.body.classList.add("modal-open");

    document.querySelectorAll(".center-carousel").forEach((el) => {
        el.style.pointerEvents = "none";
    });
}

function loadMoreCollectionItems() {
    if (!collectionRenderState.type) return;
    collectionRenderState.limit += 20;
    renderCollectionModalContent(collectionRenderState.type);
}

function closeCollectionModal() {
    const modal = document.getElementById("collectionModal");
    const content = document.getElementById("collectionModalContent");
    if (modal) modal.classList.remove("open");

    if (content) {
        content.innerHTML = "";
        content.scrollTop = 0;
        content.className = "collection-modal-content";
    }

    collectionRenderState.type = "";
    collectionRenderState.limit = 20;
    document.body.classList.remove("modal-open");

    document.querySelectorAll(".center-carousel").forEach((el) => {
        el.style.pointerEvents = "";
    });
}

function openBlogReader(id) {
    const post = blogCache.find((item) => Number(item.id) === Number(id));
    if (!post) return;

    const modal = document.getElementById("blogReaderModal");
    const titleEl = document.getElementById("readerModalTitle");
    const metaEl = document.getElementById("readerModalMeta");
    const contentEl = document.getElementById("readerModalContent");
    const externalEl = document.getElementById("readerModalExternal");

    if (titleEl) titleEl.textContent = post.title || "Blog Post";
    if (metaEl) {
        const parts = [];
        if (post.category) parts.push(post.category);
        if (post.post_date) parts.push(post.post_date);
        if (post.platform) parts.push(post.platform);
        metaEl.textContent = parts.join(" · ");
    }
    if (contentEl) {
        contentEl.innerHTML = post.content || "<p>No content available.</p>";
    }
    if (externalEl) {
        externalEl.innerHTML = post.url
            ? `<a href="${escapeAttr(post.url)}" target="_blank" rel="noopener" class="btn-ghost" style="font-size:0.85rem">Also on ${escapeHtml(post.platform || "External")} →</a>`
            : "";
    }
    if (modal) {
        modal.style.display = "block";
        modal.scrollTop = 0;
        document.body.style.overflow = "hidden";
    }
}

function closeBlogReader() {
    const modal = document.getElementById("blogReaderModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
}

function openBlogReaderFromCollection(id) {
    closeCollectionModal();
    setTimeout(() => openBlogReader(id), 180);
}

function updateLightboxImage() {
    const img = document.getElementById("lightboxImg");
    if (!img || !lightboxImages.length) return;
    img.src = lightboxImages[lightboxIndex] || "";
    resetLightboxTransform();
}

function applyLightboxTransform() {
    const img = document.getElementById("lightboxImg");
    if (!img) return;
    img.style.transform = `translate(${lightboxTranslateX}px, ${lightboxTranslateY}px) scale(${lightboxScale})`;
}

function resetLightboxTransform() {
    lightboxScale = 1;
    lightboxTranslateX = 0;
    lightboxTranslateY = 0;
    applyLightboxTransform();
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

function openLightbox(src, images = []) {
    if (!src) return;

    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    if (!lightbox || !img) return;

    lightboxImages = Array.isArray(images) && images.length ? images.filter(Boolean) : [src];
    lightboxIndex = lightboxImages.indexOf(src);
    if (lightboxIndex < 0) {
        lightboxIndex = 0;
        if (!lightboxImages.length) lightboxImages = [src];
    }

    updateLightboxImage();
    lightbox.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    const stage = document.getElementById("lightboxStage");

    if (lightbox) {
        lightbox.classList.remove("active");
        lightbox.style.background = "";
    }
    if (stage) {
        stage.style.transform = "";
        stage.style.transition = "";
    }
    if (img) {
        img.src = "";
        img.style.transform = "";
    }

    lightboxIndex = 0;
    resetLightboxTransform();
    document.body.classList.remove("modal-open");
}

function showNextLightboxImage() {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
}

function showPrevLightboxImage() {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}

function openGalleryLightbox(src) {
    openLightbox(src, galleryCache.map((item) => item.image_url || "").filter(Boolean));
}

function openDesignLightbox(src) {
    openLightbox(src, designsCache.map((item) => item.image_url || "").filter(Boolean));
}

function initLightboxSwipe() {
    const stage = document.getElementById("lightboxStage");
    const lightbox = document.getElementById("lightbox");
    if (!stage || !lightbox || stage.dataset.swipeInit === "true") return;
    stage.dataset.swipeInit = "true";

    let startX = 0;
    let startY = 0;
    let currentY = 0;
    let isPinching = false;
    let isDraggingDown = false;

    stage.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            lightboxStartDistance = getTouchDistance(e.touches);
            lightboxStartScale = lightboxScale;
            return;
        }

        if (e.touches.length === 1) {
            isPinching = false;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentY = startY;
            lightboxTouchStartX = startX;
            lightboxTouchEndX = startX;
            lightboxPanStartX = startX - lightboxTranslateX;
            lightboxPanStartY = startY - lightboxTranslateY;
            isDraggingDown = false;
        }
    }, { passive: true });

    stage.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            const newDistance = getTouchDistance(e.touches);
            if (!lightboxStartDistance) return;
            lightboxScale = Math.min(4, Math.max(1, (newDistance / lightboxStartDistance) * lightboxStartScale));
            applyLightboxTransform();
            return;
        }

        if (e.touches.length !== 1) return;

        const currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
        lightboxTouchEndX = currentX;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (lightboxScale > 1) {
            lightboxTranslateX = currentX - lightboxPanStartX;
            lightboxTranslateY = currentY - lightboxPanStartY;
            applyLightboxTransform();
            e.preventDefault();
            return;
        }

        if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
            isDraggingDown = true;
            const dragAmount = Math.max(0, deltaY);
            const progress = Math.min(dragAmount / 220, 1);
            stage.style.transform = `translateY(${dragAmount}px) scale(${1 - progress * 0.08})`;
            lightbox.style.background = `rgba(0,0,0,${0.95 - progress * 0.45})`;
            e.preventDefault();
        }
    }, { passive: false });

    stage.addEventListener("touchend", () => {
        if (isPinching) {
            isPinching = false;
            return;
        }

        const deltaX = lightboxTouchStartX - lightboxTouchEndX;
        const deltaY = currentY - startY;

        if (lightboxScale > 1) return;

        if (isDraggingDown) {
            if (deltaY > 120) {
                stage.style.transform = "";
                lightbox.style.background = "";
                closeLightbox();
                return;
            }

            stage.style.transition = "transform 0.22s ease";
            lightbox.style.transition = "background 0.22s ease";
            stage.style.transform = "";
            lightbox.style.background = "";

            setTimeout(() => {
                stage.style.transition = "";
                lightbox.style.transition = "";
            }, 220);

            isDraggingDown = false;
            return;
        }

        if (Math.abs(deltaX) > 40) {
            if (deltaX > 0) {
                showNextLightboxImage();
            } else {
                showPrevLightboxImage();
            }
        }
    });

    stage.addEventListener("dblclick", () => {
        if (lightboxScale > 1) {
            resetLightboxTransform();
        } else {
            lightboxScale = 2;
            applyLightboxTransform();
        }
    });
}

function initLightbox() {
    initLightboxSwipe();
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const orig = btn.innerHTML;
        btn.innerHTML = "Sending... ⏳";
        btn.disabled = true;

        const inputs = form.querySelectorAll("input, textarea");
        const name = inputs[0]?.value.trim() || "";
        const email = inputs[1]?.value.trim() || "";
        const subject = inputs[2]?.value.trim() || "";
        const message = inputs[3]?.value.trim() || "";

        if (!name || !email || !message) {
            showToast("⚠️ Please fill in all required fields.");
            btn.innerHTML = orig;
            btn.disabled = false;
            return;
        }

        try {
            const { error } = await supabaseClient.from("messages").insert([{ name, email, subject, message }]);
            if (error) throw error;
            showToast("✅ Message sent!");
            form.reset();
        } catch (err) {
            console.error("Message error:", err);
            showToast("❌ Failed to send. Please email directly.");
        } finally {
            btn.innerHTML = orig;
            btn.disabled = false;
        }
    });
}

function initNav() {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-links");
    const navLinks = document.querySelectorAll(".nav-links a");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => navMenu.classList.toggle("open"));
    }

    navLinks.forEach((link) => {
        link.addEventListener("click", () => navMenu?.classList.remove("open"));
    });

    window.addEventListener("scroll", () => {
        const sections = document.querySelectorAll("section[id]");
        let current = "";

        sections.forEach((section) => {
            if (window.scrollY >= section.offsetTop - 120) {
                current = section.getAttribute("id");
            }
        });

        navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
        });
    });
}

function initAdminMenu() {
    const adminMenuBtn = document.getElementById("adminMenuBtn");
    const adminDropdown = document.getElementById("adminDropdown");

    if (adminMenuBtn && adminDropdown) {
        adminMenuBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            adminDropdown.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            adminDropdown.classList.remove("open");
        });
    }
}

function initModals() {
    document.getElementById("lightbox")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closeLightbox();
    });

    document.getElementById("blogReaderModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closeBlogReader();
    });
}

function initNavbarScrollEffect() {
    const nav = document.querySelector("nav");
    if (!nav) return;

    nav.classList.add("nav-fade-in");
    let ticking = false;
    let lastY = window.scrollY;

    function updateNav() {
        const y = window.scrollY;
        nav.classList.toggle("nav-scrolled", y > 24);

        if (y > lastY && y > 80) {
            nav.classList.add("nav-fade-out");
            nav.classList.remove("nav-fade-in");
        } else {
            nav.classList.add("nav-fade-in");
            nav.classList.remove("nav-fade-out");
        }

        lastY = y;
        ticking = false;
    }

    window.addEventListener("scroll", () => {
        if (!ticking) {
            window.requestAnimationFrame(updateNav);
            ticking = true;
        }
    }, { passive: true });

    updateNav();
}

async function submitContactMessage(event) {
    event.preventDefault();
    const btn = event.target.querySelector("button");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Sending...";
    btn.disabled = true;

    try {
        const name = document.getElementById("contact-name")?.value.trim() || "";
        const email = document.getElementById("contact-email")?.value.trim() || "";
        const subject = document.getElementById("contact-subject")?.value.trim() || "";
        const message = document.getElementById("contact-message")?.value.trim() || "";
        const { error } = await supabaseClient.from("messages").insert([{ name, email, subject, message, is_read: false }]);
        if (error) throw error;
        document.getElementById("contactForm")?.reset();
        showToast("✅ Message sent successfully!");
    } catch (err) {
        console.error(err);
        showToast("❌ Failed to send message");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

document.addEventListener("DOMContentLoaded", async () => {
    initNavbarScrollEffect();

    try {
        await renderGallery();
        await renderDesigns();
        await renderBlog();
        await renderAbout();
        renderRecentWorks();
    } catch (error) {
        console.error("Initial render failed:", error);
    }

    initNav();
    initAdminMenu();
    initLightbox();
    initModals();
    initContactForm();
});

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.showNextLightboxImage = showNextLightboxImage;
window.showPrevLightboxImage = showPrevLightboxImage;
window.openGalleryLightbox = openGalleryLightbox;
window.openDesignLightbox = openDesignLightbox;

window.openBlogReader = openBlogReader;
window.closeBlogReader = closeBlogReader;
window.openBlogReaderFromCollection = openBlogReaderFromCollection;

window.openCollectionModal = openCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.loadMoreCollectionItems = loadMoreCollectionItems;

window.submitContactMessage = submitContactMessage;
window.goToPrev = () => {
    const img = document.getElementById("lightboxImg");
    if (!img || !lightboxImages.length) return;
    lightboxIndex = lightboxIndex <= 0 ? lightboxImages.length - 1 : lightboxIndex - 1;
    img.style.opacity = "0";
    setTimeout(() => {
        img.src = lightboxImages[lightboxIndex];
        img.style.opacity = "1";
        resetLightboxTransform();
    }, 180);
};

window.goToNext = () => {
    const img = document.getElementById("lightboxImg");
    if (!img || !lightboxImages.length) return;
    lightboxIndex = lightboxIndex >= lightboxImages.length - 1 ? 0 : lightboxIndex + 1;
    img.style.opacity = "0";
    setTimeout(() => {
        img.src = lightboxImages[lightboxIndex];
        img.style.opacity = "1";
        resetLightboxTransform();
    }, 180);
};