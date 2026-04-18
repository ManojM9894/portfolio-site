// ==========================================
// ADMIN.JS - FINAL CLEAN VERSION
// ==========================================

let quill = null;
const tagData = {};
const imageState = {};
const editState = {
    galleryId: null,
    designId:  null,
    blogId:    null
};

// ==========================================
// UTILITIES
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

function slugifyFileName(name) {
    return String(name || 'file')
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function setAuthError(msg = '') {
    const el = document.getElementById('authError');
    if (el) el.textContent = msg;
}

// ==========================================
// IMAGE UPLOAD
// ==========================================

async function uploadImageToSupabase(bucket, file, folder = 'uploads') {
    if (!file) return '';
    const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeBase = slugifyFileName(file.name.replace(/\.[^/.]+$/, '')) || 'image';
    const path     = `${folder}/${Date.now()}-${safeBase}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
        });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

async function resolveImageUrl(prefix, bucket, folder, fallbackUrl = '') {
    const state = imageState[prefix];
    if (!state)              return fallbackUrl || '';
    if (state.type === 'url')  return state.value;
    if (state.type === 'file') return await uploadImageToSupabase(bucket, state.value, folder);
    return fallbackUrl || '';
}

function clearImage(prefix) {
    imageState[prefix] = null;
    const p1        = document.getElementById(prefix + '-preview');
    const p2        = document.getElementById(prefix + '-url-preview');
    const fileInput = document.getElementById(prefix + '-file');
    const urlInput  = document.getElementById(prefix + '-image-url');
    if (p1)        { p1.src = ''; p1.style.display = 'none'; }
    if (p2)        { p2.src = ''; p2.style.display = 'none'; }
    if (fileInput)   fileInput.value = '';
    if (urlInput)    urlInput.value  = '';
}

function handleFileUpload(prefix) {
    const fileInput = document.getElementById(prefix + '-file');
    const file      = fileInput?.files?.[0];
    if (!file) return;
    imageState[prefix] = { type: 'file', value: file };
    const preview = document.getElementById(prefix + '-preview');
    if (preview) {
        preview.src          = URL.createObjectURL(file);
        preview.style.display = 'block';
    }
}

function previewUrl(prefix) {
    const input   = document.getElementById(prefix + '-image-url');
    const preview = document.getElementById(prefix + '-url-preview');
    const url     = input?.value.trim() || '';
    if (!url) {
        imageState[prefix] = null;
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        return;
    }
    imageState[prefix] = { type: 'url', value: url };
    if (preview) { preview.src = url; preview.style.display = 'block'; }
}

function switchUploadTab(prefix, mode, btn) {
    btn.parentElement.querySelectorAll('.upload-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const uploadPanel = document.getElementById(prefix + '-upload-panel');
    const urlPanel    = document.getElementById(prefix + '-url-panel');
    if (uploadPanel) uploadPanel.classList.toggle('active', mode === 'upload');
    if (urlPanel)    urlPanel.classList.toggle('active',    mode === 'url');
}

// ==========================================
// TAGS
// ==========================================

function addTag(e, containerId, inputId) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const input = document.getElementById(inputId);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!tagData[containerId]) tagData[containerId] = [];
    if (tagData[containerId].includes(val)) { input.value = ''; return; }
    tagData[containerId].push(val);
    renderTags(containerId, inputId);
    input.value = '';
}

function removeTag(containerId, inputId, tag) {
    tagData[containerId] = (tagData[containerId] || []).filter(t => t !== tag);
    renderTags(containerId, inputId);
}

function renderTags(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input     = document.getElementById(inputId);
    if (!container || !input) return;
    container.querySelectorAll('.tag-chip').forEach(chip => chip.remove());
    (tagData[containerId] || []).forEach(tag => {
        const chip   = document.createElement('div');
        chip.className = 'tag-chip';
        const text   = document.createElement('span');
        text.textContent = tag;
        const button = document.createElement('button');
        button.type  = 'button';
        button.textContent = '×';
        button.addEventListener('click', () => removeTag(containerId, inputId, tag));
        chip.appendChild(text);
        chip.appendChild(button);
        container.insertBefore(chip, input);
    });
}

function focusTagInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.focus();
}

function setTags(containerId, inputId, tags) {
    tagData[containerId] = Array.isArray(tags) ? [...tags] : [];
    renderTags(containerId, inputId);
}

// ==========================================
// UI HELPERS
// ==========================================

function toggleForm(id) {
    const form = document.getElementById(id);
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (id === 'blogForm' && form.style.display === 'block') initQuill();
}

function markFormEditing(formId, editing) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.classList.toggle('editing-mode', !!editing);
}

function initQuill() {
    if (quill) return;
    if (!document.getElementById('b-editor')) return;
    quill = new Quill('#b-editor', {
        theme: 'snow',
        placeholder: 'Write your blog post here...',
        modules: {
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ color: [] }, { background: [] }],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
}

// ==========================================
// AUTH
// ==========================================

async function applyAuthState() {
    const { data } = await supabaseClient.auth.getSession();
    const session  = data.session;
    const authGate = document.getElementById('authGate');
    const adminApp = document.getElementById('adminApp');

    if (session) {
        if (authGate) authGate.style.display = 'none';
        if (adminApp) adminApp.style.display = 'block';
        await updateDashboard();
        await loadAboutAdmin();
        await renderGalleryAdmin();
        await renderDesignsAdmin();
        await renderBlogAdmin();
    } else {
        if (authGate) authGate.style.display = 'grid';
        if (adminApp) adminApp.style.display = 'none';
    }
}

async function signInAdmin() {
    const email    = document.getElementById('login-email')?.value.trim() || '';
    const password = document.getElementById('login-password')?.value || '';

    if (!email || !password) { setAuthError('Email and password are required.'); return; }
    setAuthError('');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { setAuthError(error.message || 'Login failed.'); return; }
        if (data.session) await applyAuthState();
        else setAuthError('Login failed. Please try again.');
    } catch (err) {
        setAuthError('Unexpected error. Please try again.');
    }
}

async function signOutAdmin() {
    await supabaseClient.auth.signOut();
    await applyAuthState();
}

// ==========================================
// NAVIGATION
// ==========================================

function showPage(name, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    if (el) el.classList.add('active');
    else {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            if (item.getAttribute('onclick')?.includes("'" + name + "'")) {
                item.classList.add('active');
            }
        });
    }
    updateDashboard();
    if (name === 'gallery')  renderGalleryAdmin();
    if (name === 'designs')  renderDesignsAdmin();
    if (name === 'blog')     { renderBlogAdmin(); initQuill(); }
    if (name === 'about')    loadAboutAdmin();
    if (name === 'messages') loadMessages();
}

// ==========================================
// DASHBOARD
// ==========================================

async function updateDashboard() {
    try {
        const [gallery, designs, blogs, profile, messages] = await Promise.all([
            supabaseClient.from('gallery').select('id', { count: 'exact', head: true }),
            supabaseClient.from('designs').select('id', { count: 'exact', head: true }),
            supabaseClient.from('blogs').select('id',   { count: 'exact', head: true }),
            supabaseClient.from('profile').select('skills').limit(1),
            supabaseClient.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false)
        ]);

        const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        s('stat-gallery',  gallery.count  || 0);
        s('stat-designs',  designs.count  || 0);
        s('stat-blog',     blogs.count    || 0);
        s('stat-messages', messages.count || 0);
        if (profile.data?.[0]?.skills) s('stat-skills', profile.data[0].skills.length || 0);
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

// ==========================================
// GALLERY
// ==========================================

async function saveGallery() {
    const title     = document.getElementById('g-title')?.value.trim() || '';
    const currentId = editState.galleryId;

    try {
        let existing = null;
        if (currentId) {
            const { data, error } = await supabaseClient.from('gallery').select('*').eq('id', currentId).single();
            if (error) throw error;
            existing = data;
        }

        const imageUrl = await resolveImageUrl('g', 'gallery', 'gallery', existing?.image_url || '');
        const payload  = {
            title,
            category:    document.getElementById('g-category')?.value    || '',
            image_url:   imageUrl,
            description: document.getElementById('g-desc')?.value.trim() || '',
            tags:        tagData['g-tags-input'] || []
        };

        let error = null;
        if (currentId) {
            ({ error } = await supabaseClient.from('gallery').update(payload).eq('id', currentId));
        } else {
            const { data: maxRows } = await supabaseClient.from('gallery').select('sort_order').order('sort_order', { ascending: false }).limit(1);
            payload.sort_order = (maxRows?.[0]?.sort_order || 0) + 1;
            ({ error } = await supabaseClient.from('gallery').insert([payload]));
        }
        if (error) throw error;

        document.getElementById('g-title').value = '';
        document.getElementById('g-desc').value  = '';
        clearImage('g');
        tagData['g-tags-input'] = [];
        renderTags('g-tags-input', 'g-tag-field');
        editState.galleryId = null;
        markFormEditing('galleryForm', false);
        toggleForm('galleryForm');
        await renderGalleryAdmin();
        await updateDashboard();
        showToast(currentId ? '✅ Artwork updated!' : '✅ Artwork saved!');
    } catch (error) {
        showToast(`❌ ${error.message || 'Failed to save artwork'}`);
    }
}

async function editGallery(id) {
    const { data: item, error } = await supabaseClient.from('gallery').select('*').eq('id', id).single();
    if (error || !item) { showToast('❌ Failed to load artwork.'); return; }

    document.getElementById('g-title').value    = item.title       || '';
    document.getElementById('g-category').value = item.category    || 'digital';
    document.getElementById('g-desc').value     = item.description || '';

    editState.galleryId = id;
    imageState.g        = item.image_url ? { type: 'url', value: item.image_url } : null;

    const preview = document.getElementById('g-preview');
    if (preview && item.image_url) { preview.src = item.image_url; preview.style.display = 'block'; }

    setTags('g-tags-input', 'g-tag-field', item.tags || []);
    document.getElementById('galleryForm').style.display = 'block';
    markFormEditing('galleryForm', true);
    showToast('✏️ Editing artwork');
}

async function deleteGallery(id) {
    if (!confirm('Delete this artwork?')) return;
    try {
        const { error } = await supabaseClient.from('gallery').delete().eq('id', id);
        if (error) throw error;
        await renderGalleryAdmin();
        await updateDashboard();
        showToast('🗑️ Artwork deleted!');
    } catch (error) {
        showToast('❌ Failed to delete artwork.');
    }
}

async function renderGalleryAdmin() {
    const list = document.getElementById('galleryList');
    if (!list) return;
    try {
        const { data: items, error } = await supabaseClient.from('gallery').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        if (!items.length) {
            list.innerHTML = '<div class="empty"><div class="empty-icon">🎨</div><p>No artworks yet.</p></div>';
            return;
        }
        list.innerHTML = items.map(item => `
            <div class="item-card" draggable="true" data-id="${item.id}">
                <div class="drag-handle">⋮⋮</div>
                <div class="item-thumb">
                    ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || '')}"/>` : '🎨'}
                </div>
                <div class="item-info">
                    <div class="item-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="item-meta">${escapeHtml(item.category || '')}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-edit" onclick="editGallery(${item.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteGallery(${item.id})">Delete</button>
                </div>
            </div>`).join('');
        attachSortable('galleryList', 'gallery');
    } catch (error) {
        list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Failed to load artworks.</p></div>';
    }
}

// ==========================================
// DESIGNS
// ==========================================

async function saveDesign() {
    const title     = document.getElementById('d-title')?.value.trim() || '';
    const currentId = editState.designId;

    try {
        let existing = null;
        if (currentId) {
            const { data, error } = await supabaseClient.from('designs').select('*').eq('id', currentId).single();
            if (error) throw error;
            existing = data;
        }

        const imageUrl = await resolveImageUrl('d', 'designs', 'designs', existing?.image_url || '');
        const payload  = {
            title,
            category:    document.getElementById('d-category')?.value    || '',
            image_url:   imageUrl,
            description: document.getElementById('d-desc')?.value.trim() || '',
            tags:        tagData['d-tags-input'] || []
        };

        let error = null;
        if (currentId) {
            ({ error } = await supabaseClient.from('designs').update(payload).eq('id', currentId));
        } else {
            const { data: maxRows } = await supabaseClient.from('designs').select('sort_order').order('sort_order', { ascending: false }).limit(1);
            payload.sort_order = (maxRows?.[0]?.sort_order || 0) + 1;
            ({ error } = await supabaseClient.from('designs').insert([payload]));
        }
        if (error) throw error;

        document.getElementById('d-title').value = '';
        document.getElementById('d-desc').value  = '';
        clearImage('d');
        tagData['d-tags-input'] = [];
        renderTags('d-tags-input', 'd-tag-field');
        editState.designId = null;
        markFormEditing('designsForm', false);
        toggleForm('designsForm');
        await renderDesignsAdmin();
        await updateDashboard();
        showToast(currentId ? '✅ Design updated!' : '✅ Design saved!');
    } catch (error) {
        showToast(`❌ ${error.message || 'Failed to save design'}`);
    }
}

async function editDesign(id) {
    const { data: item, error } = await supabaseClient.from('designs').select('*').eq('id', id).single();
    if (error || !item) { showToast('❌ Failed to load design.'); return; }

    document.getElementById('d-title').value    = item.title       || '';
    document.getElementById('d-category').value = item.category    || 'logo';
    document.getElementById('d-desc').value     = item.description || '';

    editState.designId = id;
    imageState.d       = item.image_url ? { type: 'url', value: item.image_url } : null;

    const preview = document.getElementById('d-preview');
    if (preview && item.image_url) { preview.src = item.image_url; preview.style.display = 'block'; }

    setTags('d-tags-input', 'd-tag-field', item.tags || []);
    document.getElementById('designsForm').style.display = 'block';
    markFormEditing('designsForm', true);
    showToast('✏️ Editing design');
}

async function deleteDesign(id) {
    if (!confirm('Delete this design?')) return;
    try {
        const { error } = await supabaseClient.from('designs').delete().eq('id', id);
        if (error) throw error;
        await renderDesignsAdmin();
        await updateDashboard();
        showToast('🗑️ Design deleted!');
    } catch (error) {
        showToast('❌ Failed to delete design.');
    }
}

async function renderDesignsAdmin() {
    const list = document.getElementById('designsList');
    if (!list) return;
    try {
        const { data: items, error } = await supabaseClient.from('designs').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        if (!items || !items.length) {
            list.innerHTML = '<div class="empty"><div class="empty-icon">🖌️</div><p>No designs yet.</p></div>';
            return;
        }
        list.innerHTML = items.map(item => `
            <div class="item-card" draggable="true" data-id="${item.id}">
                <div class="drag-handle">⋮⋮</div>
                <div class="item-thumb">
                    ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || '')}"/>` : '🖌️'}
                </div>
                <div class="item-info">
                    <div class="item-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="item-meta">${escapeHtml(item.category || '')}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-edit" onclick="editDesign(${item.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteDesign(${item.id})">Delete</button>
                </div>
            </div>`).join('');
        attachSortable('designsList', 'designs');
    } catch (error) {
        list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Failed to load designs.</p></div>';
    }
}

// ==========================================
// BLOG
// ==========================================

async function saveBlog() {
    const title    = document.getElementById('b-title')?.value.trim() || '';
    const category = document.getElementById('b-category')?.value    || 'thoughts';
    const date     = document.getElementById('b-date')?.value        || new Date().toISOString().split('T')[0];
    const excerpt  = document.getElementById('b-excerpt')?.value.trim() || '';
    const platform = document.getElementById('b-platform')?.value    || '';
    const url      = document.getElementById('b-url')?.value.trim()  || '';
    const content  = quill ? quill.root.innerHTML.trim() : '';

    if (!title) { showToast('⚠️ Title is required!'); return; }

    const payload = { title, category, post_date: date, excerpt, content, platform, url };

    try {
        let error = null;
        if (editState.blogId) {
            ({ error } = await supabaseClient.from('blogs').update(payload).eq('id', editState.blogId));
        } else {
            const { data: maxRows } = await supabaseClient.from('blogs').select('sort_order').order('sort_order', { ascending: false }).limit(1);
            payload.sort_order = (maxRows?.[0]?.sort_order || 0) + 1;
            ({ error } = await supabaseClient.from('blogs').insert([payload]));
        }
        if (error) throw error;

        document.getElementById('b-title').value    = '';
        document.getElementById('b-category').value = 'thoughts';
        document.getElementById('b-date').value     = '';
        document.getElementById('b-excerpt').value  = '';
        document.getElementById('b-platform').value = '';
        document.getElementById('b-url').value      = '';
        if (quill) quill.setContents([]);

        editState.blogId = null;
        markFormEditing('blogForm', false);
        document.getElementById('blogForm').style.display = 'none';
        await renderBlogAdmin();
        await updateDashboard();
        showToast('✅ Blog post published!');
    } catch (err) {
        showToast('❌ ' + (err.message || 'Failed to publish'));
    }
}

async function editBlog(id) {
    try {
        const { data, error } = await supabaseClient.from('blogs').select('*').eq('id', id).single();
        if (error) throw error;
        if (!data) throw new Error('Post not found');

        document.getElementById('b-title').value    = data.title     || '';
        document.getElementById('b-category').value = data.category  || 'thoughts';
        document.getElementById('b-date').value     = data.post_date || '';
        document.getElementById('b-excerpt').value  = data.excerpt   || '';
        document.getElementById('b-platform').value = data.platform  || '';
        document.getElementById('b-url').value      = data.url       || '';

        initQuill();
        if (quill) quill.root.innerHTML = data.content || '';

        editState.blogId = id;
        document.getElementById('blogForm').style.display = 'block';
        markFormEditing('blogForm', true);
        showToast('✏️ Editing blog post');
    } catch (err) {
        showToast('❌ ' + (err.message || 'Failed to load post'));
    }
}

async function deleteBlog(id) {
    if (!confirm('Delete this blog post?')) return;
    try {
        const { error } = await supabaseClient.from('blogs').delete().eq('id', id);
        if (error) throw error;
        await renderBlogAdmin();
        await updateDashboard();
        showToast('🗑️ Blog post deleted!');
    } catch (err) {
        showToast('❌ ' + (err.message || 'Failed to delete'));
    }
}

async function renderBlogAdmin() {
    const list = document.getElementById('blogList');
    if (!list) return;
    try {
        const { data, error } = await supabaseClient.from('blogs').select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || !data.length) {
            list.innerHTML = '<div class="empty"><div class="empty-icon">✍️</div><p>No blog posts yet.</p></div>';
            return;
        }
        list.innerHTML = data.map(item => `
            <div class="item-card" draggable="true" data-id="${item.id}">
                <div class="drag-handle">⋮⋮</div>
                <div class="item-thumb" style="font-size:1.5rem">✍️</div>
                <div class="item-info">
                    <div class="item-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="item-meta">
                        ${item.category  ? escapeHtml(item.category)  + ' · ' : ''}
                        ${item.post_date ? escapeHtml(item.post_date) + ' · ' : ''}
                        ${item.platform  ? escapeHtml(item.platform)          : ''}
                    </div>
                    ${item.excerpt ? `<div class="item-meta" style="margin-top:0.2rem">${escapeHtml(item.excerpt)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-edit"   onclick="editBlog(${item.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteBlog(${item.id})">Delete</button>
                </div>
            </div>`).join('');
        attachSortable('blogList', 'blogs');
    } catch (err) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Error: ${escapeHtml(err.message)}</p></div>`;
    }
}

// ==========================================
// ABOUT
// ==========================================

async function loadAboutAdmin() {
    try {
        const { data: profiles, error } = await supabaseClient.from('profile').select('*').limit(1);
        if (error) throw error;
        const profile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;

        document.getElementById('a-name').value    = profile?.name    || '';
        document.getElementById('a-title').value   = profile?.title   || '';
        document.getElementById('a-tagline').value = profile?.tagline || '';
        document.getElementById('a-bio1').value    = profile?.bio1    || '';
        document.getElementById('a-bio2').value    = profile?.bio2    || '';
        document.getElementById('a-email').value   = profile?.email   || '';

        const preview = document.getElementById('av-preview');
        if (preview) {
            if (profile?.avatar_url) { preview.src = profile.avatar_url; preview.style.display = 'block'; }
            else { preview.src = ''; preview.style.display = 'none'; }
        }

        setTags('a-skills-input', 'a-skill-field', profile?.skills || []);
    } catch (error) {
        showToast(`❌ Failed to load profile: ${error.message}`);
    }
}

async function saveAbout() {
    try {
        const { data: profiles, error: currentError } = await supabaseClient.from('profile').select('*').limit(1);
        if (currentError) throw currentError;
        const currentProfile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;

        let avatarUrl = currentProfile?.avatar_url || '';
        const state   = imageState.av;
        if (state?.type === 'url')  avatarUrl = state.value;
        else if (state?.type === 'file') avatarUrl = await uploadImageToSupabase('avatars', state.value, 'avatars');

        const payload = {
            name:       document.getElementById('a-name')?.value.trim()    || '',
            title:      document.getElementById('a-title')?.value.trim()   || '',
            tagline:    document.getElementById('a-tagline')?.value.trim() || '',
            bio1:       document.getElementById('a-bio1')?.value.trim()    || '',
            bio2:       document.getElementById('a-bio2')?.value.trim()    || '',
            email:      document.getElementById('a-email')?.value.trim()   || '',
            avatar_url: avatarUrl,
            skills:     tagData['a-skills-input'] || [],
            updated_at: new Date().toISOString()
        };

        let error = null;
        if (currentProfile) {
            ({ error } = await supabaseClient.from('profile').update(payload).eq('id', currentProfile.id));
        } else {
            ({ error } = await supabaseClient.from('profile').insert([payload]));
        }
        if (error) throw error;

        await loadAboutAdmin();
        await updateDashboard();
        showToast('✅ About Me saved!');
    } catch (error) {
        showToast(`❌ Failed to save profile: ${error.message}`);
    }
}

// ==========================================
// MESSAGES
// ==========================================

async function loadMessages() {
    const list = document.getElementById('messagesList');
    if (!list) return;
    list.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><p>Loading messages...</p></div>';

    try {
        const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || !data.length) {
            list.innerHTML = '<div class="empty"><div class="empty-icon">📬</div><p>No messages yet.</p></div>';
            return;
        }

        const unread = data.filter(m => !m.is_read).length;
        const statEl = document.getElementById('stat-messages');
        if (statEl) statEl.textContent = unread;

        list.innerHTML = data.map(msg => `
            <div class="item-card" id="msg-${msg.id}" style="${!msg.is_read ? 'border-color:var(--accent)' : ''}">
                <div class="item-info">
                    <div class="item-title">
                        ${!msg.is_read ? '<span style="color:var(--accent);font-size:0.7rem;margin-right:0.5rem">● NEW</span>' : ''}
                        ${escapeHtml(msg.name)}
                        <span style="font-size:0.8rem;color:var(--muted);font-weight:400"> — ${escapeHtml(msg.email)}</span>
                    </div>
                    <div class="item-meta" style="margin:0.3rem 0;font-weight:600;color:var(--text)">${escapeHtml(msg.subject || 'No subject')}</div>
                    <div class="item-meta">${escapeHtml(msg.message)}</div>
                    <div class="item-meta" style="margin-top:0.3rem;font-size:0.75rem">${new Date(msg.created_at).toLocaleString()}</div>
                </div>
                <div class="item-actions" style="flex-direction:column;gap:0.5rem;align-items:flex-end">
                    <a href="mailto:${escapeAttr(msg.email)}?subject=Re: ${escapeAttr(msg.subject || '')}" class="btn btn-edit">↩ Reply</a>
                    ${!msg.is_read ? `<button class="btn btn-edit" onclick="markRead('${msg.id}')">✓ Read</button>` : ''}
                    <button class="btn btn-danger" onclick="deleteMessage('${msg.id}')">Delete</button>
                </div>
            </div>`).join('');
    } catch (err) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Error: ${err.message}</p></div>`;
    }
}

async function markRead(id) {
    try {
        const { error } = await supabaseClient.from('messages').update({ is_read: true }).eq('id', id);
        if (error) throw error;
        await loadMessages();
        showToast('✅ Marked as read!');
    } catch (err) {
        showToast('❌ Error: ' + err.message);
    }
}

async function deleteMessage(id) {
    if (!confirm('Delete this message?')) return;
    try {
        const { error } = await supabaseClient.from('messages').delete().eq('id', id);
        if (error) throw error;
        await loadMessages();
        showToast('🗑️ Message deleted!');
    } catch (err) {
        showToast('❌ Error: ' + err.message);
    }
}

// ==========================================
// DRAG & DROP SORT
// ==========================================

async function persistSortOrder(table, ids) {
    for (let i = 0; i < ids.length; i++) {
        const { error } = await supabaseClient.from(table).update({ sort_order: i + 1 }).eq('id', Number(ids[i]));
        if (error) throw error;
    }
}

function attachSortable(listId, table) {
    const list = document.getElementById(listId);
    if (!list) return;
    let dragged = null;

    [...list.querySelectorAll('.item-card')].forEach(card => {
        card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
        card.addEventListener('dragend', async () => {
            card.classList.remove('dragging');
            dragged = null;
            const ids = [...list.querySelectorAll('.item-card')].map(el => el.dataset.id);
            try { await persistSortOrder(table, ids); showToast('✅ Order updated!'); }
            catch (error) { showToast('❌ Failed to update order.'); }
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            const after = getDragAfterElement(list, e.clientY);
            if (!dragged) return;
            if (after == null) list.appendChild(dragged);
            else list.insertBefore(dragged, after);
        });
    });
}

function getDragAfterElement(container, y) {
    return [...container.querySelectorAll('.item-card:not(.dragging)')]
        .reduce((closest, child) => {
            const box    = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) await applyAuthState();

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await applyAuthState();
        } else if (event === 'SIGNED_OUT') {
            const authGate = document.getElementById('authGate');
            const adminApp = document.getElementById('adminApp');
            if (authGate) authGate.style.display = 'grid';
            if (adminApp) adminApp.style.display = 'none';
        }
    });
});

// ==========================================
// GLOBALS
// ==========================================

window.signInAdmin        = signInAdmin;
window.signOutAdmin       = signOutAdmin;
window.showPage           = showPage;
window.toggleForm         = toggleForm;
window.switchUploadTab    = switchUploadTab;
window.handleFileUpload   = handleFileUpload;
window.previewUrl         = previewUrl;
window.addTag             = addTag;
window.focusTagInput      = focusTagInput;
window.removeTag          = removeTag;
window.saveGallery        = saveGallery;
window.editGallery        = editGallery;
window.deleteGallery      = deleteGallery;
window.renderGalleryAdmin = renderGalleryAdmin;
window.saveDesign         = saveDesign;
window.editDesign         = editDesign;
window.deleteDesign       = deleteDesign;
window.renderDesignsAdmin = renderDesignsAdmin;
window.saveBlog           = saveBlog;
window.editBlog           = editBlog;
window.deleteBlog         = deleteBlog;
window.renderBlogAdmin    = renderBlogAdmin;
window.saveAbout          = saveAbout;
window.loadAboutAdmin     = loadAboutAdmin;
window.loadMessages       = loadMessages;
window.markRead           = markRead;
window.deleteMessage      = deleteMessage;