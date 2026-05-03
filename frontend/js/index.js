
    // ── CONFIG ──
    const API    = 'http://localhost:5000/api';
    const SERVER = 'http://localhost:5000';

    // ── HELPERS ──
    const fmtDate = d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});

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

    // ─────────────────────────────────────────────
    // 1. STATS BAR — real counts from database
    // Runs silently; shows "—" if server is offline
    // ─────────────────────────────────────────────
    const loadStatsBar = async () => {
        try {
            const [sRes, scRes, stRes] = await Promise.all([
                fetch(`${API}/enrollment`),
                fetch(`${API}/scholarship`),
                fetch(`${API}/staff`)
            ]);
            const sd  = await sRes.json();
            const sc  = await scRes.json();
            const st  = await stRes.json();

            const batches = sd.students
                ? [...new Set(sd.students.map(s => s.batch))].length
                : 0;

            document.getElementById('statStudents').innerHTML     = `${sd.total  || 0}<span>+</span>`;
            document.getElementById('statBatches').innerHTML      = `${batches}<span>+</span>`;
            document.getElementById('statScholarships').innerHTML = `${sc.total  || 0}`;
            document.getElementById('statStaff').innerHTML        = `${st.total  || 0}`;
        } catch {
            ['statStudents','statBatches','statScholarships','statStaff']
                .forEach(id => document.getElementById(id).innerHTML =
                    '<span style="font-size:20px;color:var(--text-3);">—</span>');
        }
    };

    // ─────────────────────────────────────────────
    // 2. LIVE STATS SECTION — detailed impact cards
    // Shows real numbers or empty/error states
    // ─────────────────────────────────────────────
    const loadLiveStats = async () => {
        const el = document.getElementById('liveStatsGrid');
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
                <div class="live-stat-card">
                    <span class="live-stat-icon">🎓</span>
                    <div class="live-stat-number">${sd.total || 0}</div>
                    <div class="live-stat-label">Students Enrolled</div>
                </div>
                <div class="live-stat-card">
                    <span class="live-stat-icon">📚</span>
                    <div class="live-stat-number">${batches}</div>
                    <div class="live-stat-label">Batches Completed</div>
                </div>
                <div class="live-stat-card">
                    <span class="live-stat-icon">🏆</span>
                    <div class="live-stat-number">${sc.total || 0}</div>
                    <div class="live-stat-label">Scholarships Awarded</div>
                </div>
                <div class="live-stat-card">
                    <span class="live-stat-icon">💰</span>
                    <div class="live-stat-number">₦${Number(sc.totalAmount||0).toLocaleString()}</div>
                    <div class="live-stat-label">Total Amount Awarded</div>
                </div>
                <div class="live-stat-card">
                    <span class="live-stat-icon">👨‍💼</span>
                    <div class="live-stat-number">${st.total || 0}</div>
                    <div class="live-stat-label">Staff Members</div>
                </div>`;
        } catch {
            el.innerHTML = errorHTML('Could not load statistics. Make sure the server is running.');
        }
    };

    // ─────────────────────────────────────────────
    // 3. NEWS — only shows what admin has posted
    // Empty state shown when nothing is posted yet
    // ─────────────────────────────────────────────
    const loadNews = async () => {
        const el = document.getElementById('newsGrid');
        try {
            const res  = await fetch(`${API}/news?page=1&limit=3`);
            const data = await res.json();

            if (!data.news || data.news.length === 0) {
                el.innerHTML = emptyHTML(
                    '📭',
                    'No News Posted Yet',
                    'Check back soon for updates from Tokimi Foundation.'
                );
                return;
            }

            el.innerHTML = data.news.map(item => `
                <div class="news-card">
                    <div class="news-thumb">
                        ${item.image_url
                            ? `<img src="${SERVER}${item.image_url}" alt="${item.title}">`
                            : '📰'}
                        <span class="news-cat">News</span>
                    </div>
                    <div class="news-body">
                        <div class="news-meta">
                            📅 ${fmtDate(item.created_at)}
                            ${item.author ? ` &nbsp;·&nbsp; ✍️ ${item.author}` : ''}
                        </div>
                        <h3>${item.title}</h3>
                        <p>${item.content.length > 120
                            ? item.content.substring(0,120)+'...'
                            : item.content}</p>
                        <a href="pages/news.html" class="news-link">Read More →</a>
                    </div>
                </div>`).join('');
        } catch {
            el.innerHTML = errorHTML('Server is offline. Please try again later.');
        }
    };

    // ─────────────────────────────────────────────
    // 4. STAFF PREVIEW — only shows real staff
    // Empty state shown when no staff added yet
    // ─────────────────────────────────────────────
    const loadStaff = async () => {
        const el = document.getElementById('staffGrid');
        try {
            const res  = await fetch(`${API}/staff`);
            const data = await res.json();

            if (!data.staff || data.staff.length === 0) {
                el.innerHTML = emptyHTML(
                    '👥',
                    'No Staff Members Yet',
                    'Staff profiles will appear here once added by the admin.'
                );
                return;
            }

            // Show max 4 on home page
            el.innerHTML = data.staff.slice(0,4).map(m => `
                <div class="staff-card">
                    <div class="staff-photo">
                        ${m.photo_url
                            ? `<img src="${SERVER}${m.photo_url}" alt="${m.first_name}">`
                            : '👤'}
                    </div>
                    <div class="staff-info">
                        <h3>${m.first_name} ${m.last_name}</h3>
                        <div class="role">${m.role}</div>
                        <div class="dept">${m.department || ''}</div>
                    </div>
                </div>`).join('');
        } catch {
            el.innerHTML = errorHTML('Could not load staff. Make sure the server is running.');
        }
    };

    // ─────────────────────────────────────────────
    // MOBILE MENU
    // ─────────────────────────────────────────────
    document.getElementById('hamburger').addEventListener('click', () =>
        document.getElementById('navLinks').classList.toggle('open'));

    document.querySelectorAll('.nav-links a').forEach(a =>
        a.addEventListener('click', () =>
            document.getElementById('navLinks').classList.remove('open')));

    // ─────────────────────────────────────────────
    // SCROLL ANIMATIONS
    // ─────────────────────────────────────────────
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity    = '1';
                e.target.style.transform  = 'translateY(0)';
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.course-card, .point').forEach(el => {
        el.style.opacity   = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // ─────────────────────────────────────────────
    // RUN EVERYTHING
    // ─────────────────────────────────────────────
    loadStatsBar();
    loadLiveStats();
    loadNews();
    loadStaff();