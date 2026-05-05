// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'http://localhost:5000/api';
const SERVER = 'http://localhost:5000';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
});

const fmtCurrency = amt =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency', currency: 'NGN'
    }).format(amt);

const showSectionAlert = (containerId, message, type = 'success') => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <div class="admin-alert ${type}">
            ${type === 'success' ? '✅' : '❌'} ${message}
        </div>`;
    setTimeout(() => el.innerHTML = '', 4000);
};

// ─────────────────────────────────────────
// AUTH — LOGIN
// ─────────────────────────────────────────
const handleLogin = async (e) => {
    e.preventDefault();

    const password  = document.getElementById('adminPassword').value;
    const alertEl   = document.getElementById('loginAlert');
    const btn       = document.getElementById('loginBtn');

    if (!password) {
        alertEl.innerHTML = `
            <div class="login-alert">❌ Please enter the admin password.</div>`;
        return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ Logging in...';
    alertEl.innerHTML = '';

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ password })
        });

        const data = await res.json();

        if (res.ok) {
            // Save token to sessionStorage
            sessionStorage.setItem('tokimi_admin_token', data.token);

            // Show dashboard, hide login
            document.getElementById('loginScreen').style.display    = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';

            // Load all data
            loadDashboard();

        } else {
            alertEl.innerHTML = `
                <div class="login-alert">❌ ${data.message}</div>`;
        }

    } catch (err) {
        alertEl.innerHTML = `
            <div class="login-alert">❌ Server is offline. Make sure backend is running.</div>`;
    } finally {
        btn.disabled    = false;
        btn.textContent = '🔐 Login to Dashboard';
    }
};

// ─────────────────────────────────────────
// AUTH — CHECK IF ALREADY LOGGED IN
// ─────────────────────────────────────────
const checkAuth = async () => {
    const token = sessionStorage.getItem('tokimi_admin_token');
    if (!token) return; // stay on login screen

    try {
        const res  = await fetch(`${API}/auth/verify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token })
        });

        const data = await res.json();

        if (data.valid) {
            document.getElementById('loginScreen').style.display    = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            loadDashboard();
        } else {
            sessionStorage.removeItem('tokimi_admin_token');
        }
    } catch {
        // Server offline — stay on login
    }
};

// ─────────────────────────────────────────
// AUTH — LOGOUT
// ─────────────────────────────────────────
const handleLogout = () => {
    if (!confirm('Are you sure you want to logout?')) return;
    sessionStorage.removeItem('tokimi_admin_token');
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display    = 'flex';
    document.getElementById('adminPassword').value          = '';
};

// ─────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────
const switchSection = (sectionName) => {
    // Hide all sections
    document.querySelectorAll('.admin-section')
        .forEach(s => s.classList.remove('active'));

    // Remove active from all links
    document.querySelectorAll('.sidebar-link')
        .forEach(l => l.classList.remove('active'));

    // Show selected section
    document.getElementById(`section-${sectionName}`)
        .classList.add('active');

    // Highlight active link
    document.querySelector(`[data-section="${sectionName}"]`)
        ?.classList.add('active');

    // Update topbar title
    const titles = {
        dashboard:    'Dashboard',
        news:         'News Feed Management',
        students:     'Student Enrollment',
        scholarships: 'Scholarships & Grants',
        staff:        'Staff Management',
        generator:    'ID Card & Certificate Generator'
    };
    document.getElementById('topbarTitle').textContent =
        titles[sectionName] || 'Dashboard';

    // Load section data
    if (sectionName === 'dashboard')    loadDashboard();
    if (sectionName === 'news')         loadAdminNews();
    if (sectionName === 'students')     loadAdminStudents();
    if (sectionName === 'scholarships') loadAdminScholarships();
    if (sectionName === 'staff')        loadAdminStaff();
    if (sectionName === 'generator')    loadGeneratorSelects();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
};

// ─────────────────────────────────────────
// LOAD DASHBOARD
// ─────────────────────────────────────────
const loadDashboard = async () => {
    await Promise.all([
        loadDashStats(),
        loadRecentStudents(),
        loadRecentNews()
    ]);
};

const refreshDashboard = () => loadDashboard();

// Dashboard Stats
const loadDashStats = async () => {
    const el = document.getElementById('dashStats');
    try {
        const [sRes, scRes, stRes, nRes] = await Promise.all([
            fetch(`${API}/enrollment`),
            fetch(`${API}/scholarship`),
            fetch(`${API}/staff`),
            fetch(`${API}/news?page=1&limit=100`)
        ]);

        const sd = await sRes.json();
        const sc = await scRes.json();
        const st = await stRes.json();
        const nd = await nRes.json();

        el.innerHTML = `
            <div class="dash-stat-card">
                <div class="dash-stat-icon blue">👨‍🎓</div>
                <div class="dash-stat-info">
                    <h3>${sd.total || 0}</h3>
                    <p>Total Students</p>
                </div>
            </div>
            <div class="dash-stat-card">
                <div class="dash-stat-icon orange">🏆</div>
                <div class="dash-stat-info">
                    <h3>${sc.total || 0}</h3>
                    <p>Awards Given</p>
                </div>
            </div>
            <div class="dash-stat-card">
                <div class="dash-stat-icon green">💰</div>
                <div class="dash-stat-info">
                    <h3>₦${Number(sc.totalAmount || 0).toLocaleString()}</h3>
                    <p>Total Awarded</p>
                </div>
            </div>
            <div class="dash-stat-card">
                <div class="dash-stat-icon purple">👨‍💼</div>
                <div class="dash-stat-info">
                    <h3>${st.total || 0}</h3>
                    <p>Staff Members</p>
                </div>
            </div>
            <div class="dash-stat-card">
                <div class="dash-stat-icon red">📰</div>
                <div class="dash-stat-info">
                    <h3>${nd.total || 0}</h3>
                    <p>News Articles</p>
                </div>
            </div>`;

    } catch {
        el.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:var(--text-2);padding:30px;">
                ⚠️ Could not load statistics. Make sure the server is running.
            </div>`;
    }
};

// Recent Students
const loadRecentStudents = async () => {
    const el = document.getElementById('recentStudents');
    try {
        const res  = await fetch(`${API}/enrollment`);
        const data = await res.json();
        const list = (data.students || []).slice(0, 5);

        if (list.length === 0) {
            el.innerHTML = `
                <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">
                    No students enrolled yet
                </div>`;
            return;
        }

        el.innerHTML = list.map(s => `
            <div class="recent-item">
                <div>
                    <div class="recent-item-name">
                        ${s.first_name} ${s.last_name}
                    </div>
                    <div class="recent-item-sub">
                        ${s.batch} · ${s.year}
                    </div>
                </div>
                <span class="recent-item-badge status-${s.status}">
                    ${s.status}
                </span>
            </div>`).join('');

    } catch {
        el.innerHTML = `
            <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">
                Could not load students
            </div>`;
    }
};

// Recent News
const loadRecentNews = async () => {
    const el = document.getElementById('recentNews');
    try {
        const res  = await fetch(`${API}/news?page=1&limit=5`);
        const data = await res.json();
        const list = data.news || [];

        if (list.length === 0) {
            el.innerHTML = `
                <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">
                    No news articles posted yet
                </div>`;
            return;
        }

        el.innerHTML = list.map(n => `
            <div class="recent-item">
                <div>
                    <div class="recent-item-name">${n.title}</div>
                    <div class="recent-item-sub">
                        ${fmtDate(n.created_at)}
                        ${n.author ? ` · ${n.author}` : ''}
                    </div>
                </div>
                <div class="action-btns">
                    <button class="action-btn delete"
                        onclick="deleteNews(${n.id}, \`${n.title}\`)">
                        🗑️
                    </button>
                </div>
            </div>`).join('');

    } catch {
        el.innerHTML = `
            <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">
                Could not load news
            </div>`;
    }
};

// ─────────────────────────────────────────
// NEWS MANAGEMENT
// ─────────────────────────────────────────
const loadAdminNews = async () => {
    const wrapper = document.getElementById('newsTableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading articles...</p>
        </div>`;

    try {
        const res  = await fetch(`${API}/news?page=1&limit=100`);
        const data = await res.json();
        const list = data.news || [];

        if (list.length === 0) {
            wrapper.innerHTML = `
                <div class="empty-state" style="border:none;">
                    <div class="ei">📭</div>
                    <h3>No Articles Posted Yet</h3>
                    <p>Click "Post New Article" to create your first news post.</p>
                </div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Date Posted</th>
                        <th>Image</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((n, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>
                                <strong>${n.title}</strong>
                                <br>
                                <span style="font-size:11px;color:var(--text-3);">
                                    ${n.content.substring(0, 60)}...
                                </span>
                            </td>
                            <td>${n.author || '—'}</td>
                            <td>${fmtDate(n.created_at)}</td>
                            <td>${n.image_url
                                ? `<img src="${SERVER}${n.image_url}"
                                        style="width:50px;height:40px;object-fit:cover;
                                               border-radius:6px;">`
                                : '—'
                            }</td>
                            <td>
                                <div class="action-btns">
                                    <button class="action-btn edit"
                                        onclick="openEditNewsModal(${n.id})">
                                        ✏️ Edit
                                    </button>
                                    <button class="action-btn delete"
                                        onclick="deleteNews(${n.id}, \`${n.title}\`)">
                                        🗑️ Del
                                    </button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Articles</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

// Open News Modal — Post New
const openNewsModal = (editData = null) => {
    const overlay = document.getElementById('newsModal');
    const content = document.getElementById('newsModalContent');

    content.innerHTML = `
        <div class="modal-header">
            <h3>${editData ? '✏️ Edit Article' : '📰 Post New Article'}</h3>
            <button class="modal-close-btn" onclick="closeNewsModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="newsModalAlert"></div>
            <div class="form-group">
                <label>Article Title *</label>
                <input type="text" id="news_title"
                    value="${editData?.title || ''}"
                    placeholder="Enter article title..." />
            </div>
            <div class="form-group">
                <label>Author</label>
                <input type="text" id="news_author"
                    value="${editData?.author || ''}"
                    placeholder="e.g. Admin" />
            </div>
            <div class="form-group">
                <label>Content *</label>
                <textarea id="news_content" rows="6"
                    placeholder="Write the full article content here..."
                >${editData?.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Image ${editData ? '(leave empty to keep current)' : ''}</label>
                <input type="file" id="news_image" accept="image/*" />
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm"
                onclick="closeNewsModal()">
                Cancel
            </button>
            <button class="btn btn-orange btn-sm"
                onclick="${editData
                    ? `saveEditNews(${editData.id})`
                    : 'submitNews()'
                }">
                ${editData ? '💾 Save Changes' : '📰 Post Article'}
            </button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeNewsModal();
    });
};

// Submit New News
const submitNews = async () => {
    const title   = document.getElementById('news_title').value.trim();
    const author  = document.getElementById('news_author').value.trim();
    const content = document.getElementById('news_content').value.trim();
    const image   = document.getElementById('news_image').files[0];
    const alertEl = document.getElementById('newsModalAlert');

    if (!title || !content) {
        alertEl.innerHTML = `
            <div class="admin-alert danger">❌ Title and content are required.</div>`;
        return;
    }

    const formData = new FormData();
    formData.append('title',   title);
    formData.append('author',  author);
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
        const res  = await fetch(`${API}/news`, {
            method: 'POST',
            body:   formData
        });

        const data = await res.json();

        if (res.ok) {
            closeNewsModal();
            showSectionAlert('newsAlertContainer', 'Article posted successfully!');
            loadAdminNews();
            loadRecentNews();
        } else {
            alertEl.innerHTML = `
                <div class="admin-alert danger">❌ ${data.message}</div>`;
        }

    } catch {
        alertEl.innerHTML = `
            <div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

// Open Edit News Modal
const openEditNewsModal = async (id) => {
    try {
        const res  = await fetch(`${API}/news/${id}`);
        const data = await res.json();
        openNewsModal(data.news);
    } catch {
        alert('Could not load article data.');
    }
};

// Save Edited News
const saveEditNews = async (id) => {
    const title   = document.getElementById('news_title').value.trim();
    const author  = document.getElementById('news_author').value.trim();
    const content = document.getElementById('news_content').value.trim();
    const image   = document.getElementById('news_image').files[0];
    const alertEl = document.getElementById('newsModalAlert');

    if (!title || !content) {
        alertEl.innerHTML = `
            <div class="admin-alert danger">❌ Title and content are required.</div>`;
        return;
    }

    const formData = new FormData();
    formData.append('title',   title);
    formData.append('author',  author);
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
        const res  = await fetch(`${API}/news/${id}`, {
            method: 'PUT',
            body:   formData
        });

        const data = await res.json();

        if (res.ok) {
            closeNewsModal();
            showSectionAlert('newsAlertContainer', 'Article updated successfully!');
            loadAdminNews();
        } else {
            alertEl.innerHTML = `
                <div class="admin-alert danger">❌ ${data.message}</div>`;
        }

    } catch {
        alertEl.innerHTML = `
            <div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

// Delete News
const deleteNews = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API}/news/${id}`, { method: 'DELETE' });

        if (res.ok) {
            showSectionAlert('newsAlertContainer', 'Article deleted successfully!');
            loadAdminNews();
            loadRecentNews();
        }
    } catch {
        alert('Server error. Please try again.');
    }
};

const closeNewsModal = () => {
    document.getElementById('newsModal').style.display = 'none';
    document.body.style.overflow = '';
};

// ─────────────────────────────────────────
// STUDENTS TABLE
// ─────────────────────────────────────────
const loadAdminStudents = async () => {
    const wrapper = document.getElementById('studentsTableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading students...</p>
        </div>`;

    const batch = document.getElementById('adminBatchFilter')?.value || '';
    const year  = document.getElementById('adminYearFilter')?.value  || '';

    let url = `${API}/enrollment`;
    const params = [];
    if (batch) params.push(`batch=${batch}`);
    if (year)  params.push(`year=${year}`);
    if (params.length) url += `?${params.join('&')}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();
        const list = data.students || [];

        if (list.length === 0) {
            wrapper.innerHTML = `
                <div class="empty-state" style="border:none;">
                    <div class="ei">👨‍🎓</div>
                    <h3>No Students Found</h3>
                    <p>No students match the selected filters.</p>
                </div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Batch</th>
                        <th>Year</th>
                        <th>Status</th>
                        <th>Enrolled</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((s, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${s.first_name} ${s.last_name}</strong></td>
                            <td>${s.email || '—'}</td>
                            <td>${s.batch}</td>
                            <td>${s.year}</td>
                            <td>
                                <span class="status-badge status-${s.status}">
                                    ${s.status}
                                </span>
                            </td>
                            <td>${fmtDate(s.enrolled_at)}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="action-btn delete"
                                        onclick="adminDeleteStudent(${s.id},
                                        '${s.first_name} ${s.last_name}')">
                                        🗑️ Del
                                    </button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Students</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

const adminDeleteStudent = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API}/enrollment/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminStudents();
            loadDashStats();
        }
    } catch {
        alert('Server error.');
    }
};

const exportStudents = () => {
    const batch = document.getElementById('adminBatchFilter')?.value || '';
    const year  = document.getElementById('adminYearFilter')?.value  || '';
    let url = `${API}/enrollment/export`;
    const params = [];
    if (batch) params.push(`batch=${batch}`);
    if (year)  params.push(`year=${year}`);
    if (params.length) url += `?${params.join('&')}`;
    window.open(url, '_blank');
};

// ─────────────────────────────────────────
// SCHOLARSHIPS TABLE
// ─────────────────────────────────────────
const loadAdminScholarships = async () => {
    const wrapper = document.getElementById('scholarshipsTableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading records...</p>
        </div>`;

    try {
        const res  = await fetch(`${API}/scholarship`);
        const data = await res.json();
        const list = data.scholarships || [];

        if (list.length === 0) {
            wrapper.innerHTML = `
                <div class="empty-state" style="border:none;">
                    <div class="ei">🏆</div>
                    <h3>No Awards Recorded Yet</h3>
                    <p>Go to the Scholarship page to record awards.</p>
                </div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Date Awarded</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((r, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>
                                <strong>${r.first_name} ${r.last_name}</strong>
                                <br>
                                <span style="font-size:11px;color:var(--text-3);">
                                    ${r.batch} · ${r.year}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge type-${r.type}">
                                    ${r.type}
                                </span>
                            </td>
                            <td style="color:var(--success);font-weight:700;">
                                ${fmtCurrency(r.amount)}
                            </td>
                            <td>${fmtDate(r.date_awarded)}</td>
                            <td style="max-width:200px;white-space:normal;">
                                ${r.description || '—'}
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Records</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

const exportScholarships = () => {
    window.open(`${API}/scholarship/export`, '_blank');
};

// ─────────────────────────────────────────
// STAFF TABLE
// ─────────────────────────────────────────
const loadAdminStaff = async () => {
    const wrapper = document.getElementById('staffTableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading staff...</p>
        </div>`;

    try {
        const res  = await fetch(`${API}/staff`);
        const data = await res.json();
        const list = data.staff || [];

        if (list.length === 0) {
            wrapper.innerHTML = `
                <div class="empty-state" style="border:none;">
                    <div class="ei">👨‍💼</div>
                    <h3>No Staff Members Yet</h3>
                    <p>Click "Add Staff" to add the first staff member.</p>
                </div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Photo</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((m, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>
                                ${m.photo_url
                                    ? `<img src="${SERVER}${m.photo_url}"
                                            style="width:40px;height:40px;object-fit:cover;
                                                   border-radius:50%;">`
                                    : '<span style="font-size:24px;">👤</span>'
                                }
                            </td>
                            <td><strong>${m.first_name} ${m.last_name}</strong></td>
                            <td>${m.role}</td>
                            <td>${m.department || '—'}</td>
                            <td>${m.email || '—'}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="action-btn delete"
                                        onclick="adminDeleteStaff(${m.id},
                                        '${m.first_name} ${m.last_name}')">
                                        🗑️ Del
                                    </button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Staff</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

// Open Staff Modal — Add New
const openStaffModal = () => {
    const overlay = document.getElementById('staffModal');
    const content = document.getElementById('staffModalContent');

    content.innerHTML = `
        <div class="modal-header">
            <h3>👨‍💼 Add New Staff Member</h3>
            <button class="modal-close-btn" onclick="closeStaffModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="staffModalAlert"></div>
            <div class="form-row">
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" id="staff_first_name"
                        placeholder="e.g. Ngozi" />
                </div>
                <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" id="staff_last_name"
                        placeholder="e.g. Adeyemi" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="staff_email"
                        placeholder="e.g. ngozi@tokimi.org" />
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="staff_phone"
                        placeholder="e.g. 08012345678" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Role *</label>
                    <input type="text" id="staff_role"
                        placeholder="e.g. Program Coordinator" />
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" id="staff_department"
                        placeholder="e.g. Training" />
                </div>
            </div>
            <div class="form-group">
                <label>Photo</label>
                <input type="file" id="staff_photo" accept="image/*" />
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm"
                onclick="closeStaffModal()">
                Cancel
            </button>
            <button class="btn btn-orange btn-sm"
                onclick="submitStaff()">
                👨‍💼 Add Staff Member
            </button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeStaffModal();
    });
};

// Submit New Staff
const submitStaff = async () => {
    const first_name = document.getElementById('staff_first_name').value.trim();
    const last_name  = document.getElementById('staff_last_name').value.trim();
    const role       = document.getElementById('staff_role').value.trim();
    const alertEl    = document.getElementById('staffModalAlert');

    if (!first_name || !last_name || !role) {
        alertEl.innerHTML = `
            <div class="admin-alert danger">
                ❌ First name, last name and role are required.
            </div>`;
        return;
    }

    const formData = new FormData();
    formData.append('first_name',  first_name);
    formData.append('last_name',   last_name);
    formData.append('email',       document.getElementById('staff_email').value.trim());
    formData.append('phone',       document.getElementById('staff_phone').value.trim());
    formData.append('role',        role);
    formData.append('department',  document.getElementById('staff_department').value.trim());

    const photo = document.getElementById('staff_photo').files[0];
    if (photo) formData.append('photo', photo);

    try {
        const res  = await fetch(`${API}/staff`, {
            method: 'POST',
            body:   formData
        });

        const data = await res.json();

        if (res.ok) {
            closeStaffModal();
            showSectionAlert('staffAlertContainer', data.message);
            loadAdminStaff();
            loadDashStats();
        } else {
            alertEl.innerHTML = `
                <div class="admin-alert danger">❌ ${data.message}</div>`;
        }

    } catch {
        alertEl.innerHTML = `
            <div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const adminDeleteStaff = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API}/staff/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminStaff();
            loadDashStats();
        }
    } catch {
        alert('Server error.');
    }
};

const exportStaff = () => {
    window.open(`${API}/staff/export`, '_blank');
};

const closeStaffModal = () => {
    document.getElementById('staffModal').style.display = 'none';
    document.body.style.overflow = '';
};

// ─────────────────────────────────────────
// GENERATOR SELECTS
// Populates student and staff dropdowns
// ─────────────────────────────────────────
const loadGeneratorSelects = async () => {
    try {
        const [sRes, stRes] = await Promise.all([
            fetch(`${API}/enrollment`),
            fetch(`${API}/staff`)
        ]);

        const sd = await sRes.json();
        const st = await stRes.json();

        const students = sd.students || [];
        const staff    = st.staff    || [];

        const studentOptions = students.length
            ? students.map(s =>
                `<option value="${s.id}">
                    ${s.first_name} ${s.last_name} — ${s.batch}
                </option>`).join('')
            : '<option value="">No students enrolled</option>';

        const staffOptions = staff.length
            ? staff.map(m =>
                `<option value="${m.id}">
                    ${m.first_name} ${m.last_name} — ${m.role}
                </option>`).join('')
            : '<option value="">No staff members added</option>';

        document.getElementById('idCardStudentSelect').innerHTML =
            `<option value="">-- Select Student --</option>${studentOptions}`;
        document.getElementById('certStudentSelect').innerHTML =
            `<option value="">-- Select Student --</option>${studentOptions}`;
        document.getElementById('idCardStaffSelect').innerHTML =
            `<option value="">-- Select Staff --</option>${staffOptions}`;

    } catch {
        console.error('Could not load generator options');
    }
};

const generateStudentId = () => {
    const id = document.getElementById('idCardStudentSelect').value;
    if (!id) { alert('Please select a student first.'); return; }
    window.open(`${API}/generate/idcard/student/${id}`, '_blank');
};

const generateStaffId = () => {
    const id = document.getElementById('idCardStaffSelect').value;
    if (!id) { alert('Please select a staff member first.'); return; }
    window.open(`${API}/generate/idcard/staff/${id}`, '_blank');
};

const generateCertificate = () => {
    const id = document.getElementById('certStudentSelect').value;
    if (!id) { alert('Please select a student first.'); return; }
    window.open(`${API}/generate/certificate/${id}`, '_blank');
};

// ─────────────────────────────────────────
// SIDEBAR TOGGLE (mobile)
// ─────────────────────────────────────────
document.getElementById('sidebarToggle')
    .addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

// ─────────────────────────────────────────
// PASSWORD TOGGLE
// ─────────────────────────────────────────
document.getElementById('togglePassword')
    .addEventListener('click', () => {
        const input = document.getElementById('adminPassword');
        input.type  = input.type === 'password' ? 'text' : 'password';
    });

// ─────────────────────────────────────────
// SIDEBAR LINK CLICKS
// ─────────────────────────────────────────
document.querySelectorAll('.sidebar-link[data-section]')
    .forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(link.dataset.section);
        });
    });

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
document.getElementById('logoutBtn')
    .addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

// ─────────────────────────────────────────
// CLOSE MODALS WITH ESCAPE
// ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeNewsModal();
        closeStaffModal();
    }
});

// ─────────────────────────────────────────
// LOGIN FORM SUBMIT
// ─────────────────────────────────────────
document.getElementById('loginForm')
    .addEventListener('submit', handleLogin);

// ─────────────────────────────────────────
// INIT — Check if already logged in
// ─────────────────────────────────────────
checkAuth();