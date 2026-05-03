// ─────────────────────────────────────────
// COURSES PAGE — Scroll Animations Only
// This page is fully static (fixed curriculum)
// No backend fetching needed here
// ─────────────────────────────────────────

const initAnimations = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(
        '.course-visual, .course-detail-content, .intro-stat, .topic-item'
    ).forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
};

// ─────────────────────────────────────────
// ACTIVE NAV LINK HIGHLIGHT
// ─────────────────────────────────────────
const highlightNav = () => {
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === 'courses.html') {
            link.classList.add('active');
        }
    });
};

// RUN
initAnimations();
highlightNav();