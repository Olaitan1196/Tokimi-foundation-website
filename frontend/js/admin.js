import { API_BASE_URL } from './api.js';
const API    = API_BASE_URL;
const SERVER = API_BASE_URL.replace('/api', '');

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
    scholarships: 'Scholarships',
    grants:       'Grants',
    staff:        'Staff Management',
    generator:    'ID Card & Certificate Generator',
    lookups:      'Manage Schools & Classes',
    attendance:   'Attendance'
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
    if (sectionName === 'grants')       loadAdminGrants();
    if (sectionName === 'lookups')      loadLookupEntries();

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
    wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading students...</p></div>`;

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
        allStudents = data.students || [];

        if (allStudents.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">👨‍🎓</div><h3>No Students Found</h3><p>No students match the selected filters.</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead><tr><th>#</th><th>Student Name</th><th>Gender</th><th>School</th><th>Class</th><th>Batch</th><th>Year</th><th>Status</th><th>Enrolled</th><th>Actions</th></tr></thead>
                <tbody>
                    ${allStudents.map((s, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}</strong></td>
                            <td>${s.gender || '—'}</td>
                            <td>${s.school_name || '—'}</td>
                            <td>${s.class_name || '—'}</td>
                            <td>${s.batch}</td>
                            <td>${s.year}</td>
                            <td><span class="status-badge status-${s.status}">${s.status}</span></td>
                            <td>${fmtDate(s.enrolled_at)}</td>
                            <td><div class="action-btns">
                                <button class="action-btn edit" onclick="openStudentEditModal(${s.id})">✏️ Edit</button>
                                <button class="action-btn delete" onclick="adminDeleteStudent(${s.id}, \`${s.first_name} ${s.last_name}\`)">🗑️ Del</button>
                            </div></td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">⚠️</div><h3>Could Not Load Students</h3><p>Make sure the backend server is running.</p></div>`;
    }
};

let allStudents = [];

const openStudentEditModal = async (id) => {
    await loadStudentLookups();
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    const overlay = document.getElementById('studentModal');
    const content = document.getElementById('studentModalContent');

    const schoolOptions = ctSchools.map(s => `<option value="${s.id}" ${student.school_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    const classOptions  = ctClasses.map(c => `<option value="${c.id}" ${student.class_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthOptions = months.map(m => `<option value="${m}" ${student.month === m ? 'selected' : ''}>${m}</option>`).join('');

    content.innerHTML = `
        <div class="modal-header"><h3>✏️ Edit Student</h3><button class="modal-close-btn" onclick="closeStudentModal()">✕</button></div>
        <div class="modal-body">
            <div id="studentModalAlert"></div>
            <div class="form-row">
                <div class="form-group"><label>First Name *</label><input type="text" id="edit_first_name" value="${student.first_name}" /></div>
                <div class="form-group"><label>Middle Name</label><input type="text" id="edit_middle_name" value="${student.middle_name || ''}" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Last Name *</label><input type="text" id="edit_last_name" value="${student.last_name}" /></div>
                <div class="form-group"><label>Gender *</label>
                    <select id="edit_gender">
                        <option value="male" ${student.gender === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${student.gender === 'female' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input type="tel" id="edit_phone" value="${student.phone || ''}" /></div>
                <div class="form-group"><label>Address</label><input type="text" id="edit_address" value="${student.address || ''}" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>School *</label><select id="edit_school_id">${schoolOptions}</select></div>
                <div class="form-group"><label>Class *</label><select id="edit_class_id">${classOptions}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Batch *</label>
                    <select id="edit_batch">
                        ${['Batch-A','Batch-B','Batch-C','Batch-D','Batch-E'].map(b => `<option value="${b}" ${student.batch === b ? 'selected' : ''}>${b.replace('Batch-','Batch ')}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Year *</label>
                    <select id="edit_year">
                        ${[2023,2024,2025,2026].map(y => `<option value="${y}" ${student.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Month *</label><select id="edit_month">${monthOptions}</select></div>
                <div class="form-group"><label>Status *</label>
                    <select id="edit_status">
                        ${['active','graduated','withdrawn','expelled'].map(st => `<option value="${st}" ${student.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Status Reason</label><input type="text" id="edit_status_reason" value="${student.status_reason || ''}" placeholder="Required if withdrawn/expelled" /></div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm" onclick="closeStudentModal()">Cancel</button>
            <button class="btn btn-orange btn-sm" onclick="saveEditStudent(${id})">💾 Save Changes</button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStudentModal(); });
};

const saveEditStudent = async (id) => {
    const updatedData = {
        first_name:    document.getElementById('edit_first_name').value.trim(),
        middle_name:   document.getElementById('edit_middle_name').value.trim(),
        last_name:     document.getElementById('edit_last_name').value.trim(),
        gender:        document.getElementById('edit_gender').value,
        phone:         document.getElementById('edit_phone').value.trim(),
        address:       document.getElementById('edit_address').value.trim(),
        school_id:     document.getElementById('edit_school_id').value,
        class_id:      document.getElementById('edit_class_id').value,
        batch:         document.getElementById('edit_batch').value,
        year:          parseInt(document.getElementById('edit_year').value),
        month:         document.getElementById('edit_month').value,
        status:        document.getElementById('edit_status').value,
        status_reason: document.getElementById('edit_status_reason').value.trim()
    };

    const alertEl = document.getElementById('studentModalAlert');
    if (!updatedData.first_name || !updatedData.last_name) {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ First and last name are required.</div>`;
        return;
    }

    try {
        const res  = await fetch(`${API}/enrollment/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) });
        const data = await res.json();
        if (res.ok) {
            closeStudentModal();
            loadAdminStudents();
            loadDashStats();
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const closeStudentModal = () => {
    document.getElementById('studentModal').style.display = 'none';
    document.body.style.overflow = '';
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
// LOOKUP CACHES
// ─────────────────────────────────────────
let scholarshipSchools = [];
let scholarshipClasses = [];
let grantSchools       = [];
let ctSchools = [];
let ctClasses = [];

const loadScholarshipLookups = async () => {
    if (scholarshipSchools.length && scholarshipClasses.length) return;
    try {
        const [schRes, clsRes] = await Promise.all([
            fetch(`${API}/lookup/scholarship-schools`),
            fetch(`${API}/lookup/scholarship-classes`)
        ]);
        scholarshipSchools = (await schRes.json()).entries;
        scholarshipClasses = (await clsRes.json()).entries;
    } catch { console.error('Could not load scholarship lookups'); }
};

const loadGrantLookups = async () => {
    if (grantSchools.length) return;
    try {
        const res = await fetch(`${API}/lookup/grant-schools`);
        grantSchools = (await res.json()).entries;
    } catch { console.error('Could not load grant lookups'); }
};

const loadStudentLookups = async () => {
    if (ctSchools.length && ctClasses.length) return;
    try {
        const [schRes, clsRes] = await Promise.all([
            fetch(`${API}/lookup/computer-training-schools`),
            fetch(`${API}/lookup/computer-training-classes`)
        ]);
        ctSchools = (await schRes.json()).entries;
        ctClasses = (await clsRes.json()).entries;
    } catch { console.error('Could not load student lookups'); }
};
// ─────────────────────────────────────────
// SCHOLARSHIPS
// ─────────────────────────────────────────
let allScholarships = [];

const loadAdminScholarships = async () => {
    const wrapper = document.getElementById('scholarshipsTableWrapper');
    wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading records...</p></div>`;
    try {
        const res  = await fetch(`${API}/scholarship`);
        const data = await res.json();
        allScholarships = data.scholarships || [];

        if (allScholarships.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">🏆</div><h3>No Scholarships Awarded Yet</h3><p>Click "Award Scholarship" to record the first one.</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead><tr><th>#</th><th>Student</th><th>School</th><th>Class</th><th>Purpose</th><th>Amount</th><th>Date Awarded</th><th>Actions</th></tr></thead>
                <tbody>
                    ${allScholarships.map((r, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${r.student_name}</strong></td>
                            <td>${r.school_name || '—'}</td>
                            <td>${r.class_name || '—'}</td>
                            <td>${r.purpose}</td>
                            <td style="color:var(--success);font-weight:700;">${fmtCurrency(r.amount)}</td>
                            <td>${fmtDate(r.date_awarded)}</td>
                            <td><div class="action-btns">
                                <button class="action-btn edit" onclick="openScholarshipModal(${r.id})">✏️ Edit</button>
                                <button class="action-btn delete" onclick="deleteScholarship(${r.id}, \`${r.student_name}\`)">🗑️ Del</button>
                            </div></td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    } catch {
        wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">⚠️</div><h3>Could Not Load Scholarships</h3><p>Make sure the backend server is running.</p></div>`;
    }
};

const openScholarshipModal = async (id = null) => {
    await loadScholarshipLookups();
    const editData = id ? allScholarships.find(r => r.id === id) : null;
    const overlay  = document.getElementById('scholarshipModal');
    const content  = document.getElementById('scholarshipModalContent');

    const schoolOptions = scholarshipSchools.map(s => `<option value="${s.id}" ${editData?.school_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    const classOptions  = scholarshipClasses.map(c => `<option value="${c.id}" ${editData?.class_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const purposeOptions = ['WAEC','NECO','GCE','JAMB'].map(p => `<option value="${p}" ${editData?.purpose === p ? 'selected' : ''}>${p}</option>`).join('');
    const dateVal = editData ? new Date(editData.date_awarded).toISOString().split('T')[0] : '';

    content.innerHTML = `
        <div class="modal-header"><h3>${editData ? '✏️ Edit Scholarship' : '🏆 Award Scholarship'}</h3><button class="modal-close-btn" onclick="closeScholarshipModal()">✕</button></div>
        <div class="modal-body">
            <div id="scholarshipModalAlert"></div>
            <div class="form-group"><label>Student Name *</label><input type="text" id="sch_student_name" value="${editData?.student_name || ''}" placeholder="e.g. Amina Bello" /></div>
            <div class="form-row">
                <div class="form-group"><label>School *</label><select id="sch_school_id"><option value="">-- Select School --</option>${schoolOptions}</select></div>
                <div class="form-group"><label>Class *</label><select id="sch_class_id"><option value="">-- Select Class --</option>${classOptions}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Purpose *</label><select id="sch_purpose"><option value="">-- Select --</option>${purposeOptions}</select></div>
                <div class="form-group"><label>Amount (₦) *</label><input type="number" id="sch_amount" value="${editData?.amount || ''}" min="0" /></div>
            </div>
            <div class="form-group"><label>Date Awarded *</label><input type="date" id="sch_date_awarded" value="${dateVal}" /></div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm" onclick="closeScholarshipModal()">Cancel</button>
            <button class="btn btn-orange btn-sm" onclick="${editData ? `saveEditScholarship(${id})` : 'submitScholarship()'}">${editData ? '💾 Save Changes' : '🏆 Award Scholarship'}</button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeScholarshipModal(); });
};

const getScholarshipFormData = () => ({
    student_name: document.getElementById('sch_student_name').value.trim(),
    school_id:    document.getElementById('sch_school_id').value,
    class_id:     document.getElementById('sch_class_id').value,
    purpose:      document.getElementById('sch_purpose').value,
    amount:       parseFloat(document.getElementById('sch_amount').value),
    date_awarded: document.getElementById('sch_date_awarded').value
});

const submitScholarship = async () => {
    const formData = getScholarshipFormData();
    const alertEl  = document.getElementById('scholarshipModalAlert');
    if (!formData.student_name || !formData.school_id || !formData.class_id || !formData.purpose || !formData.amount || !formData.date_awarded) {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ All fields are required.</div>`;
        return;
    }
    try {
        const res  = await fetch(`${API}/scholarship`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        const data = await res.json();
        if (res.ok) {
            closeScholarshipModal();
            showSectionAlert('scholarshipAlertContainer', data.message);
            loadAdminScholarships();
            loadDashStats();
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const saveEditScholarship = async (id) => {
    const formData = getScholarshipFormData();
    const alertEl  = document.getElementById('scholarshipModalAlert');
    try {
        const res  = await fetch(`${API}/scholarship/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        const data = await res.json();
        if (res.ok) {
            closeScholarshipModal();
            showSectionAlert('scholarshipAlertContainer', 'Scholarship updated successfully!');
            loadAdminScholarships();
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const deleteScholarship = async (id, name) => {
    if (!confirm(`Delete scholarship for ${name}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API}/scholarship/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showSectionAlert('scholarshipAlertContainer', 'Scholarship deleted.');
            loadAdminScholarships();
            loadDashStats();
        }
    } catch { alert('Server error.'); }
};

const closeScholarshipModal = () => {
    document.getElementById('scholarshipModal').style.display = 'none';
    document.body.style.overflow = '';
};

const exportScholarships = () => window.open(`${API}/scholarship/export`, '_blank');

// ─────────────────────────────────────────
// GRANTS
// ─────────────────────────────────────────
let allGrants = [];

const loadAdminGrants = async () => {
    const wrapper = document.getElementById('grantsTableWrapper');
    wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading records...</p></div>`;
    try {
        const res  = await fetch(`${API}/grant`);
        const data = await res.json();
        allGrants = data.grants || [];

        if (allGrants.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">🤝</div><h3>No Grants Awarded Yet</h3><p>Click "Award Grant" to record the first one.</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead><tr><th>#</th><th>Beneficiary</th><th>Status</th><th>School / Business</th><th>Purpose</th><th>Amount</th><th>Date Awarded</th><th>Actions</th></tr></thead>
                <tbody>
                    ${allGrants.map((g, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${g.beneficiary_name}</strong></td>
                            <td>${g.beneficiary_status}</td>
                            <td>${g.beneficiary_status === 'student' ? (g.school_name || '—') : (g.business_type || '—')}</td>
                            <td>${g.purpose}</td>
                            <td style="color:var(--success);font-weight:700;">${fmtCurrency(g.amount)}</td>
                            <td>${fmtDate(g.date_awarded)}</td>
                            <td><div class="action-btns">
                                <button class="action-btn edit" onclick="openGrantModal(${g.id})">✏️ Edit</button>
                                <button class="action-btn delete" onclick="deleteGrant(${g.id}, \`${g.beneficiary_name}\`)">🗑️ Del</button>
                            </div></td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    } catch {
        wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">⚠️</div><h3>Could Not Load Grants</h3><p>Make sure the backend server is running.</p></div>`;
    }
};

const openGrantModal = async (id = null) => {
    await loadGrantLookups();
    const editData = id ? allGrants.find(g => g.id === id) : null;
    const overlay  = document.getElementById('grantModal');
    const content  = document.getElementById('grantModalContent');

    const schoolOptions = grantSchools.map(s => `<option value="${s.id}" ${editData?.school_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    const dateVal = editData ? new Date(editData.date_awarded).toISOString().split('T')[0] : '';
    const isStudent = editData ? editData.beneficiary_status === 'student' : true;

    content.innerHTML = `
        <div class="modal-header"><h3>${editData ? '✏️ Edit Grant' : '🤝 Award Grant'}</h3><button class="modal-close-btn" onclick="closeGrantModal()">✕</button></div>
        <div class="modal-body">
            <div id="grantModalAlert"></div>
            <div class="form-group"><label>Beneficiary Name *</label><input type="text" id="grant_beneficiary_name" value="${editData?.beneficiary_name || ''}" /></div>
            <div class="form-group"><label>Beneficiary Type *</label>
                <select id="grant_beneficiary_status" onchange="toggleGrantFields()">
                    <option value="student" ${isStudent ? 'selected' : ''}>Student</option>
                    <option value="business_owner" ${!isStudent ? 'selected' : ''}>Business Owner</option>
                </select>
            </div>
            <div class="form-group" id="grant_school_group" style="display:${isStudent ? 'flex' : 'none'};">
                <label>School *</label><select id="grant_school_id"><option value="">-- Select School --</option>${schoolOptions}</select>
            </div>
            <div class="form-group" id="grant_business_group" style="display:${isStudent ? 'none' : 'flex'};">
                <label>Business Type *</label><input type="text" id="grant_business_type" value="${editData?.business_type || ''}" placeholder="e.g. Tailoring" />
            </div>
            <div class="form-row">
                <div class="form-group"><label>Purpose *</label><input type="text" id="grant_purpose" value="${editData?.purpose || ''}" placeholder="e.g. Business startup support" /></div>
                <div class="form-group"><label>Amount (₦) *</label><input type="number" id="grant_amount" value="${editData?.amount || ''}" min="0" /></div>
            </div>
            <div class="form-group"><label>Date Awarded *</label><input type="date" id="grant_date_awarded" value="${dateVal}" /></div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm" onclick="closeGrantModal()">Cancel</button>
            <button class="btn btn-orange btn-sm" onclick="${editData ? `saveEditGrant(${id})` : 'submitGrant()'}">${editData ? '💾 Save Changes' : '🤝 Award Grant'}</button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGrantModal(); });
};

const toggleGrantFields = () => {
    const isStudent = document.getElementById('grant_beneficiary_status').value === 'student';
    document.getElementById('grant_school_group').style.display   = isStudent ? 'flex' : 'none';
    document.getElementById('grant_business_group').style.display = isStudent ? 'none' : 'flex';
};

const getGrantFormData = () => {
    const status = document.getElementById('grant_beneficiary_status').value;
    return {
        beneficiary_name:   document.getElementById('grant_beneficiary_name').value.trim(),
        beneficiary_status: status,
        school_id:          status === 'student' ? document.getElementById('grant_school_id').value : null,
        business_type:      status === 'business_owner' ? document.getElementById('grant_business_type').value.trim() : null,
        purpose:            document.getElementById('grant_purpose').value.trim(),
        amount:             parseFloat(document.getElementById('grant_amount').value),
        date_awarded:       document.getElementById('grant_date_awarded').value
    };
};

const submitGrant = async () => {
    const formData = getGrantFormData();
    const alertEl  = document.getElementById('grantModalAlert');
    if (!formData.beneficiary_name || !formData.purpose || !formData.amount || !formData.date_awarded) {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ All required fields must be filled.</div>`;
        return;
    }
    try {
        const res  = await fetch(`${API}/grant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        const data = await res.json();
        if (res.ok) {
            closeGrantModal();
            showSectionAlert('grantAlertContainer', data.message);
            loadAdminGrants();
            loadDashStats();
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const saveEditGrant = async (id) => {
    const formData = getGrantFormData();
    const alertEl  = document.getElementById('grantModalAlert');
    try {
        const res  = await fetch(`${API}/grant/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        const data = await res.json();
        if (res.ok) {
            closeGrantModal();
            showSectionAlert('grantAlertContainer', 'Grant updated successfully!');
            loadAdminGrants();
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const deleteGrant = async (id, name) => {
    if (!confirm(`Delete grant for ${name}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API}/grant/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showSectionAlert('grantAlertContainer', 'Grant deleted.');
            loadAdminGrants();
            loadDashStats();
        }
    } catch { alert('Server error.'); }
};

const closeGrantModal = () => {
    document.getElementById('grantModal').style.display = 'none';
    document.body.style.overflow = '';
};

const exportGrants = () => window.open(`${API}/grant/export`, '_blank');

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
// LOOKUP MANAGEMENT (Schools & Classes)
// ─────────────────────────────────────────
let currentLookupType = 'computer-training-schools';

const switchLookupTab = (type) => {
    currentLookupType = type;
    document.querySelectorAll('.lookup-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-lookup="${type}"]`).classList.add('active');
    loadLookupEntries();
};

const loadLookupEntries = async () => {
    const wrapper = document.getElementById('lookupTableWrapper');
    wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>`;
    try {
        const res  = await fetch(`${API}/lookup/${currentLookupType}?includeInactive=true`);
        const data = await res.json();
        const list = data.entries || [];

        if (list.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">📭</div><h3>No Entries Yet</h3><p>Add one using the field above.</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead><tr><th>#</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${list.map((e, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${e.name}</strong></td>
                            <td><span class="status-badge status-${e.is_active ? 'active' : 'withdrawn'}">${e.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td><div class="action-btns">
                                ${e.is_active
                                    ? `<button class="action-btn delete" onclick="removeLookupEntry(${e.id})">🗑️ Deactivate</button>`
                                    : `<button class="action-btn edit" onclick="reactivateLookupEntry(${e.id})">♻️ Reactivate</button>`
                                }
                            </div></td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    } catch {
        wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">⚠️</div><h3>Could Not Load Entries</h3><p>Make sure the backend server is running.</p></div>`;
    }
};

const addLookupEntry = async () => {
    const input = document.getElementById('lookupNewName');
    const name  = input.value.trim();
    if (!name) return;

    try {
        const res  = await fetch(`${API}/lookup/${currentLookupType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (res.ok) {
            input.value = '';
            showSectionAlert('lookupAlertContainer', data.message);
            loadLookupEntries();
        } else {
            showSectionAlert('lookupAlertContainer', data.message, 'danger');
        }
    } catch {
        showSectionAlert('lookupAlertContainer', 'Server error. Try again.', 'danger');
    }
};

const removeLookupEntry = async (id) => {
    if (!confirm('Deactivate this entry? It will stop appearing in forms but existing records keep their reference.')) return;
    try {
        const res  = await fetch(`${API}/lookup/${currentLookupType}/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showSectionAlert('lookupAlertContainer', data.message);
            loadLookupEntries();
        }
    } catch { alert('Server error.'); }
};

const reactivateLookupEntry = async (id) => {
    try {
        const res  = await fetch(`${API}/lookup/${currentLookupType}/${id}/reactivate`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            showSectionAlert('lookupAlertContainer', data.message);
            loadLookupEntries();
        }
    } catch { alert('Server error.'); }
};

// ─────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────
let currentAttendanceSheet = [];

const loadAttendanceSheet = async () => {
    const batch = document.getElementById('attBatchSelect').value;
    const date  = document.getElementById('attDate').value;
    const wrapper = document.getElementById('attendanceSheetWrapper');

    if (!batch || !date) {
        showSectionAlert('attendanceAlertContainer', 'Please select both a batch and a date.', 'danger');
        return;
    }

    wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading sheet...</p></div>`;

    try {
        const res  = await fetch(`${API}/attendance?batch=${batch}&date=${date}`);
        const data = await res.json();
        currentAttendanceSheet = data.attendance || [];

        if (currentAttendanceSheet.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">👨‍🎓</div><h3>No Students in This Batch</h3></div>`;
            return;
        }

        const statuses = ['present', 'absent', 'excused', 'late'];

        wrapper.innerHTML = `
            <table>
                <thead><tr><th>#</th><th>Student Name</th><th>Status</th></tr></thead>
                <tbody>
                    ${currentAttendanceSheet.map((s, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${s.first_name} ${s.last_name}</strong></td>
                            <td>
                                <select class="att-status-select" data-student-id="${s.student_id}">
                                    <option value="">-- Not Marked --</option>
                                    ${statuses.map(st => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                                </select>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;

    } catch {
        wrapper.innerHTML = `<div class="empty-state" style="border:none;"><div class="ei">⚠️</div><h3>Could Not Load Sheet</h3><p>Make sure the backend server is running.</p></div>`;
    }
};

const markAllPresent = () => {
    document.querySelectorAll('.att-status-select').forEach(sel => sel.value = 'present');
};

const saveAttendance = async () => {
    const batch = document.getElementById('attBatchSelect').value;
    const date  = document.getElementById('attDate').value;

    if (!batch || !date) {
        showSectionAlert('attendanceAlertContainer', 'Please select both a batch and a date.', 'danger');
        return;
    }

    const records = Array.from(document.querySelectorAll('.att-status-select'))
        .filter(sel => sel.value)
        .map(sel => ({ student_id: parseInt(sel.dataset.studentId), status: sel.value }));

    if (records.length === 0) {
        showSectionAlert('attendanceAlertContainer', 'No statuses selected — nothing to save.', 'danger');
        return;
    }

    try {
        const res  = await fetch(`${API}/attendance/mark-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch, date, records })
        });
        const data = await res.json();
        if (res.ok) {
            showSectionAlert('attendanceAlertContainer', data.message);
        } else {
            showSectionAlert('attendanceAlertContainer', data.message, 'danger');
        }
    } catch {
        showSectionAlert('attendanceAlertContainer', 'Server error. Try again.', 'danger');
    }
};

const exportAttendance = () => {
    const batch = document.getElementById('expBatchSelect').value;
    const start = document.getElementById('expStartDate').value;
    const end   = document.getElementById('expEndDate').value;

    if (!batch || !start || !end) {
        showSectionAlert('attendanceAlertContainer', 'Please select batch, start date and end date to export.', 'danger');
        return;
    }

    window.open(`${API}/attendance/export?batch=${batch}&start_date=${start}&end_date=${end}`, '_blank');
};

const importAttendanceFile = async () => {
    const batch = document.getElementById('impBatchSelect').value;
    const file  = document.getElementById('impFile').files[0];

    if (!batch || !file) {
        showSectionAlert('attendanceAlertContainer', 'Please select a batch and a CSV file to import.', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('batch', batch);
    formData.append('file', file);

    try {
        const res  = await fetch(`${API}/attendance/import`, { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            showSectionAlert('attendanceAlertContainer', data.message);
            if (data.errors && data.errors.length) console.warn('Import errors:', data.errors);
        } else {
            showSectionAlert('attendanceAlertContainer', data.message, 'danger');
        }
    } catch {
        showSectionAlert('attendanceAlertContainer', 'Server error. Try again.', 'danger');
    }
};

// ─────────────────────────────────────────
// IMPORT STUDENTS (bulk CSV)
// ─────────────────────────────────────────
const openImportModal = () => {
    const overlay = document.getElementById('importModal');
    const content = document.getElementById('importModalContent');

    content.innerHTML = `
        <div class="modal-header"><h3>📥 Import Students</h3><button class="modal-close-btn" onclick="closeImportModal()">✕</button></div>
        <div class="modal-body">
            <div id="importModalAlert"></div>
            <p style="font-size:13px;color:var(--text-2);margin-bottom:16px;line-height:1.6;">
                Upload a CSV with columns: <strong>NAMES, SEX, SCHOOL, CLASS, ADDRESS, PHONE NUMBER</strong>.
                Batch, year and month below apply to every row in the file.
            </p>
            <div class="form-row">
                <div class="form-group">
                    <label>Batch *</label>
                    <select id="imp_batch">
                        <option value="">-- Select --</option>
                        <option value="Batch-A">Batch A</option>
                        <option value="Batch-B">Batch B</option>
                        <option value="Batch-C">Batch C</option>
                        <option value="Batch-D">Batch D</option>
                        <option value="Batch-E">Batch E</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Year *</label>
                    <select id="imp_year">
                        <option value="">-- Select --</option>
                        <option value="2023">2023</option><option value="2024">2024</option>
                        <option value="2025">2025</option><option value="2026">2026</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Month *</label>
                <select id="imp_month">
                    <option value="">-- Select --</option>
                    ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>CSV File *</label>
                <input type="file" id="imp_file" accept=".csv" />
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm" onclick="closeImportModal()">Cancel</button>
            <button class="btn btn-orange btn-sm" onclick="submitImportStudents()">📥 Import Students</button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeImportModal(); });
};

const submitImportStudents = async () => {
    const batch = document.getElementById('imp_batch').value;
    const year  = document.getElementById('imp_year').value;
    const month = document.getElementById('imp_month').value;
    const file  = document.getElementById('imp_file').files[0];
    const alertEl = document.getElementById('importModalAlert');

    if (!batch || !year || !month || !file) {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Batch, year, month and a CSV file are all required.</div>`;
        return;
    }

    const formData = new FormData();
    formData.append('batch', batch);
    formData.append('year', year);
    formData.append('month', month);
    formData.append('file', file);

    try {
        const res  = await fetch(`${API}/enrollment/import`, { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            closeImportModal();
            showSectionAlert('studentsAlertContainer', data.message); // fallback container; replaced below
            loadAdminStudents();
            loadDashStats();
            if (data.errors && data.errors.length) console.warn('Import errors:', data.errors);
        } else {
            alertEl.innerHTML = `<div class="admin-alert danger">❌ ${data.message}</div>`;
        }
    } catch {
        alertEl.innerHTML = `<div class="admin-alert danger">❌ Server error. Try again.</div>`;
    }
};

const closeImportModal = () => {
    document.getElementById('importModal').style.display = 'none';
    document.body.style.overflow = '';
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
        closeScholarshipModal();
        closeGrantModal();
        closeStudentModal();
        closeImportModal();
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

// ─────────────────────────────────────────
// EXPOSE FUNCTIONS FOR INLINE onclick HANDLERS
// Required because type="module" scopes everything
// to the module — not global — by default
// ─────────────────────────────────────────
window.refreshDashboard      = refreshDashboard;
window.switchSection         = switchSection;
window.openNewsModal         = openNewsModal;
window.openEditNewsModal     = openEditNewsModal;
window.saveEditNews          = saveEditNews;
window.submitNews            = submitNews;
window.deleteNews            = deleteNews;
window.closeNewsModal        = closeNewsModal;
window.exportStudents        = exportStudents;
window.adminDeleteStudent    = adminDeleteStudent;
window.loadAdminStudents     = loadAdminStudents;
window.openStaffModal        = openStaffModal;
window.submitStaff           = submitStaff;
window.adminDeleteStaff      = adminDeleteStaff;
window.closeStaffModal       = closeStaffModal;
window.exportStaff           = exportStaff;
window.generateStudentId     = generateStudentId;
window.generateStaffId       = generateStaffId;
window.generateCertificate   = generateCertificate;
window.openScholarshipModal  = openScholarshipModal;
window.submitScholarship     = submitScholarship;
window.saveEditScholarship   = saveEditScholarship;
window.deleteScholarship     = deleteScholarship;
window.closeScholarshipModal = closeScholarshipModal;
window.exportScholarships    = exportScholarships;
window.openGrantModal        = openGrantModal;
window.submitGrant           = submitGrant;
window.saveEditGrant         = saveEditGrant;
window.deleteGrant           = deleteGrant;
window.closeGrantModal       = closeGrantModal;
window.toggleGrantFields     = toggleGrantFields;
window.exportGrants          = exportGrants;
window.openStudentEditModal = openStudentEditModal;
window.saveEditStudent      = saveEditStudent;
window.closeStudentModal    = closeStudentModal;
window.switchLookupTab       = switchLookupTab;
window.addLookupEntry        = addLookupEntry;
window.removeLookupEntry     = removeLookupEntry;
window.reactivateLookupEntry = reactivateLookupEntry;
window.loadAttendanceSheet  = loadAttendanceSheet;
window.markAllPresent       = markAllPresent;
window.saveAttendance       = saveAttendance;
window.exportAttendance     = exportAttendance;
window.importAttendanceFile = importAttendanceFile;
window.openImportModal      = openImportModal;
window.submitImportStudents = submitImportStudents;
window.closeImportModal     = closeImportModal;