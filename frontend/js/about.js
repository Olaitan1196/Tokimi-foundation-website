// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'http://localhost:5000/api';
const SERVER = 'http://localhost:5000';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const emptyHTML = (icon, title, msg) => `
    <div class="empty-state">
        <div class="ei">${icon}</div>
        <h3>${title}</h3>
        <p>${msg}</p>
    </div>`;

const errorHTML = (msg) => `
    <div class="error-state">
        <div class="ei">⚠️</div>
        <h3>Could Not Load Data</h3>
        <p>${msg}</p>
    </div>`;

// ─────────────────────────────────────────
// 1. LOAD IMPACT STATS
// Fetches real numbers from the backend
// Shows 0 if nothing added yet — not fake numbers
// ─────────────────────────────────────────
const loadImpactStats = async () => {
    const el = document.getElementById('impactGrid');
    try {
        const [sRes, scRes, stRes] = await Promise.all([
            fetch(`${API}/enrollment`),
            fetch(`${API}/scholarship`),
            fetch(`${API}/staff`)
        ]);

        const sd = await sRes.json();
        const sc = await scRes.json();
        const st = await stRes.json();

        const batches = sd.students
            ? [...new Set(sd.students.map(s => s.batch))].length
            : 0;

        el.innerHTML = `
            <div class="impact-card">
                <span class="impact-icon">🎓</span>
                <div class="impact-number">${sd.total || 0}</div>
                <div class="impact-label">Students Enrolled</div>
            </div>
            <div class="impact-card">
                <span class="impact-icon">📚</span>
                <div class="impact-number">${batches}</div>
                <div class="impact-label">Batches Completed</div>
            </div>
            <div class="impact-card">
                <span class="impact-icon">🏆</span>
                <div class="impact-number">${sc.total || 0}</div>
                <div class="impact-label">Scholarships Awarded</div>
            </div>
            <div class="impact-card">
                <span class="impact-icon">💰</span>
                <div class="impact-number">₦${Number(sc.totalAmount || 0).toLocaleString()}</div>
                <div class="impact-label">Total Amount Awarded</div>
            </div>
            <div class="impact-card">
                <span class="impact-icon">👨‍💼</span>
                <div class="impact-number">${st.total || 0}</div>
                <div class="impact-label">Staff Members</div>
            </div>`;

    } catch (err) {
        el.innerHTML = errorHTML('Could not load statistics. Make sure the server is running.');
    }
};

// ─────────────────────────────────────────
// 2. LOAD TEAM / STAFF PREVIEW
// Shows only first 4 staff members
// Empty state shown if no staff added yet
// ─────────────────────────────────────────
const loadTeam = async () => {
    const el = document.getElementById('teamGrid');
    try {
        const res  = await fetch(`${API}/staff`);
        const data = await res.json();

        if (!data.staff || data.staff.length === 0) {
            el.innerHTML = emptyHTML(
                '👥',
                'No Team Members Yet',
                'Staff profiles will appear here once added by the admin.'
            );
            return;
        }

        // Show max 4 on the about page
        el.innerHTML = data.staff.slice(0, 4).map(m => `
            <div class="team-card">
                <div class="team-photo">
                    ${m.photo_url
                        ? `<img src="${SERVER}${m.photo_url}" alt="${m.first_name} ${m.last_name}">`
                        : '👤'
                    }
                </div>
                <div class="team-info">
                    <h3>${m.first_name} ${m.last_name}</h3>
                    <div class="role">${m.role}</div>
                    <div class="dept">${m.department || ''}</div>
                </div>
            </div>`).join('');

    } catch (err) {
        el.innerHTML = errorHTML('Could not load team members. Make sure the server is running.');
    }
};

// ─────────────────────────────────────────
// 3. SCROLL ANIMATIONS
// Animates cards when they enter the viewport
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

    document.querySelectorAll('.mv-card, .offer-card, .timeline-item').forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
};

// ─────────────────────────────────────────
// RUN EVERYTHING
// ─────────────────────────────────────────
loadImpactStats();
loadTeam();
initAnimations();