const loadPartial = async (url, placeholderId) => {
    const el = document.getElementById(placeholderId);
    if (!el) return;
    try {
        const res  = await fetch(url);
        const html = await res.text();
        el.innerHTML = html;
    } catch (err) {
        console.error(`Could not load partial: ${url}`, err);
    }
};

const highlightActiveNav = () => {
    const path = window.location.pathname;
    document.querySelectorAll('#navLinks a').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
};

const initPartials = async () => {
    await Promise.all([
        loadPartial('/partials/navbar.html', 'navbar-placeholder'),
        loadPartial('/partials/footer.html', 'footer-placeholder')
    ]);

    highlightActiveNav();

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Let other scripts (like main.js) know it's now safe
    // to attach listeners to navbar/footer elements
    document.dispatchEvent(new Event('partialsLoaded'));
};

initPartials();