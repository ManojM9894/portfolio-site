// ==========================================
// GITHUB API - Fetch Manoj's Repositories
// ==========================================

const GITHUB_USERNAME = 'ManojM9894';

async function loadGithubProjects() {
    const container = document.getElementById('githubCards');

    try {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <p>Loading GitHub projects...</p>
            </div>`;

        const response = await fetch(
            `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=12`
        );

        if (!response.ok) throw new Error('GitHub API error');

        const repos = await response.json();

        if (repos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💻</div>
                    <p>No public repositories yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = repos.map(repo => `
            <div class="github-card">
                <div class="github-card-header">
                    <span>📁</span>
                    <a class="github-card-name"
                       href="${repo.html_url}"
                       target="_blank"
                       rel="noopener noreferrer">
                        ${repo.name}
                    </a>
                </div>
                <p class="github-card-desc">
                    ${repo.description || 'No description provided.'}
                </p>
                <div class="github-stats">
                    ${repo.language ? `
                        <span class="github-stat">
                            <span class="github-lang-dot"></span>
                            ${repo.language}
                        </span>` : ''}
                    <span class="github-stat">⭐ ${repo.stargazers_count}</span>
                    <span class="github-stat">🍴 ${repo.forks_count}</span>
                    <span class="github-stat">👁️ ${repo.watchers_count}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Could not load GitHub projects. 
                   <a href="https://github.com/${GITHUB_USERNAME}" 
                      target="_blank" 
                      style="color: var(--accent)">
                      View on GitHub
                   </a>
                </p>
            </div>`;
    }
}

// Load when GitHub section is visible
const githubObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadGithubProjects();
            githubObserver.disconnect();
        }
    });
}, { threshold: 0.1 });

githubObserver.observe(document.getElementById('github'));