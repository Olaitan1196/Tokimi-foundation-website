// ─────────────────────────────────────────
// MOBILE MENU — shared across all pages
// Waits for navbar/footer partials to be
// injected into the page before running
// ─────────────────────────────────────────
document.addEventListener('partialsLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () =>
                navLinks.classList.remove('open')));
    }
});