// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'https://tokimi-foundation-website-production.up.railway.app/api';
const SERVER = 'https://tokimi-foundation-website-production.up.railway.app';

// ─────────────────────────────────────────
// STATE — tracks current page and all articles
// ─────────────────────────────────────────
let currentPage  = 1;
const LIMIT      = 9;
let allNews      = [];
let filteredNews = [];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
});

const readTime = content => {
    const words = content.split(' ').length;
    const mins  = Math.ceil(words / 200);
    return `${mins} min read`;
};

const emptyHTML = (icon, title, msg) => `
    <div class="empty-state">
        <div class="ei">${icon}</div>
        <h3>${title}</h3>
        <p>${msg}</p>
    </div>`;

const errorHTML = msg => `
    <div class="error-state">
        <div class="ei">⚠️</div>
        <h3>Could Not Load News</h3>
        <p>${msg}</p>
    </div>`;

// ─────────────────────────────────────────
// RENDER NEWS CARDS
// Builds cards from fetched data only
// Nothing is hardcoded
// ─────────────────────────────────────────
const renderNews = (articles) => {
    const grid = document.getElementById('newsGrid');

    if (!articles || articles.length === 0) {
        grid.innerHTML = emptyHTML(
            '📭',
            'No News Articles Yet',
            'The admin has not posted any news yet. Check back soon!'
        );
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Paginate
    const start   = (currentPage - 1) * LIMIT;
    const end     = start + LIMIT;
    const paged   = articles.slice(start, end);

    grid.innerHTML = paged.map(item => `
        <div class="news-card">
            <div class="news-thumb">
                ${item.image_url
                    ? `<img src="${SERVER}${item.image_url}" alt="${item.title}">`
                    : '📰'
                }
                <span class="news-cat">News</span>
                <span class="news-date-badge">📅 ${fmtDate(item.created_at)}</span>
            </div>
            <div class="news-body">
                <div class="news-meta">
                    <span>📅 ${fmtDate(item.created_at)}</span>
                    ${item.author
                        ? `<span class="news-author">✍️ ${item.author}</span>`
                        : ''
                    }
                </div>
                <h3>${item.title}</h3>
                <p>${item.content.length > 140
                    ? item.content.substring(0, 140) + '...'
                    : item.content
                }</p>
                <div class="news-footer">
                    <button
                        class="news-read-more"
                        onclick="openModal(${item.id})"
                    >
                        Read Full Article →
                    </button>
                    <span class="news-read-time">
                        🕐 ${readTime(item.content)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    renderPagination(articles.length);
};

// ─────────────────────────────────────────
// RENDER PAGINATION
// ─────────────────────────────────────────
const renderPagination = (total) => {
    const container  = document.getElementById('pagination');
    const totalPages = Math.ceil(total / LIMIT);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn"
            onclick="changePage(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}>
            ←
        </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}"
                onclick="changePage(${i})">
                ${i}
            </button>`;
    }

    html += `
        <button class="page-btn"
            onclick="changePage(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}>
            →
        </button>`;

    container.innerHTML = html;
};

// ─────────────────────────────────────────
// CHANGE PAGE
// ─────────────────────────────────────────
const changePage = (page) => {
    const totalPages = Math.ceil(filteredNews.length / LIMIT);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderNews(filteredNews);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ─────────────────────────────────────────
// OPEN ARTICLE MODAL
// Fetches full article and displays it
// ─────────────────────────────────────────
const openModal = async (id) => {
    try {
        const res  = await fetch(`${API}/news/${id}`);
        const data = await res.json();
        const item = data.news;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'newsModal';

        overlay.innerHTML = `
            <div class="modal">
                <button class="modal-close" onclick="closeModal()">✕</button>
                ${item.image_url
                    ? `<img class="modal-img"
                            src="${SERVER}${item.image_url}"
                            alt="${item.title}">`
                    : `<div class="modal-img-placeholder">📰</div>`
                }
                <div class="modal-body">
                    <div class="modal-meta">
                        <span class="modal-cat">News</span>
                        <span class="modal-date">📅 ${fmtDate(item.created_at)}</span>
                        ${item.author
                            ? `<span class="modal-author">✍️ ${item.author}</span>`
                            : ''
                        }
                    </div>
                    <h2>${item.title}</h2>
                    <div class="modal-content">${item.content}</div>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Close on overlay click (outside modal)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

    } catch (err) {
        alert('Could not load article. Please try again.');
    }
};

// ─────────────────────────────────────────
// CLOSE MODAL
// ─────────────────────────────────────────
const closeModal = () => {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
};

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ─────────────────────────────────────────
// SEARCH FUNCTIONALITY
// Filters articles by title or content
// ─────────────────────────────────────────
const initSearch = () => {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        currentPage = 1;

        if (!query) {
            filteredNews = [...allNews];
        } else {
            filteredNews = allNews.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                (item.author && item.author.toLowerCase().includes(query))
            );
        }

        renderNews(filteredNews);
    });
};

// ─────────────────────────────────────────
// FILTER TABS
// ─────────────────────────────────────────
const initFilterTabs = () => {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab')
                .forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            currentPage = 1;
            const filter = tab.dataset.filter;

            if (filter === 'all') {
                filteredNews = [...allNews];
            } else if (filter === 'recent') {
                filteredNews = [...allNews].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                );
            }

            renderNews(filteredNews);
        });
    });
};

// ─────────────────────────────────────────
// LOAD NEWS FROM BACKEND
// Fetches ALL news then handles
// filtering, search and pagination locally
// ─────────────────────────────────────────
const loadNews = async () => {
    const grid = document.getElementById('newsGrid');

    try {
        // Fetch all news (high limit to get everything)
        const res  = await fetch(`${API}/news?page=1&limit=100`);
        const data = await res.json();

        allNews      = data.news || [];
        filteredNews = [...allNews];

        renderNews(filteredNews);

    } catch (err) {
        grid.innerHTML = errorHTML(
            'Server is offline. Please make sure the backend is running.'
        );
    }
};

// ─────────────────────────────────────────
// SCROLL ANIMATION
// ─────────────────────────────────────────
const initAnimations = () => {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.news-card').forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
};

// ─────────────────────────────────────────
// RUN EVERYTHING
// ─────────────────────────────────────────
loadNews();
initSearch();
initFilterTabs();