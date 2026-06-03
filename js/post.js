function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function loadPost() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const titleEl = document.getElementById('postTitle');
    const metaEl = document.getElementById('postMeta');
    const contentEl = document.getElementById('postContent');
    const shareBtn = document.getElementById('sharePostBtn');

    if (!id) {
        titleEl.textContent = 'Post not found';
        contentEl.innerHTML = '<p>Missing post ID.</p>';
        return;
    }

    try {
        const response = await fetch('./data/blogs.json?v=1', { cache: 'no-store' });

        if (!response.ok) {
            throw new Error('Failed to load blog data');
        }

        const posts = await response.json();
        const post = posts.find(item => Number(item.id) === Number(id));

        if (!post) {
            titleEl.textContent = 'Post not found';
            contentEl.innerHTML = '<p>This post does not exist.</p>';
            return;
        }

        document.title = `${post.title} | Manoj Mandava`;

        titleEl.textContent = post.title || 'Untitled';
        metaEl.textContent = [
            post.category,
            post.post_date,
            post.platform
        ].filter(Boolean).join(' · ');

        contentEl.innerHTML = post.content || `<p>${escapeHtml(post.excerpt || '')}</p>`;

        shareBtn.addEventListener('click', async () => {
            const shareUrl = `https://manojmandava.com/post.html?id=${post.id}`;

            const shareData = {
                title: post.title || 'Blog Post',
                text: post.excerpt || post.title || 'Read this post',
                url: shareUrl
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(shareUrl);
                    alert('Link copied!');
                }
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    console.error(error);
                }
            }
        });
    } catch (error) {
        console.error(error);
        titleEl.textContent = 'Failed to load post';
        contentEl.innerHTML = '<p>Please try again later.</p>';
    }
}

loadPost();