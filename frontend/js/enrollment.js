// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'https://tokimi-foundation-website-production.up.railway.app/api';
const SERVER = 'https://tokimi-foundation-website-production.up.railway.app';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let allStudents      = [];
let filteredStudents = [];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
});

const showAlert = (message, type = 'success') => {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type}">
            ${type === 'success' ? '✅' : '❌'} ${message}
        </div>`;
    setTimeout(() => container.innerHTML = '', 4000);
};

const setLoading = (loading) => {
    const btn = document.getElementById('submitBtn');
    btn.disabled    = loading;
    btn.textContent = loading ? '⏳ Enrolling...' : '🎓 Enroll Student';
};

// ─────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────
const validateForm = () => {
    let valid = true;

    const fields = [
        { id: 'first_name', msg: 'First name is required' },
        { id: 'last_name',  msg: 'Last name is required' },
        { id: 'batch',      msg: 'Please select a batch' },
        { id: 'year',       msg: 'Please select a year' },
    ];

    // Clear all previous errors
    fields.forEach(f => {
        document.getElementById(f.id).classList.remove('error', 'success');
        document.getElementById(`err-${f.id}`).textContent = '';
    });

    // Validate each required field
    fields.forEach(f => {
        const el  = document.getElementById(f.id);
        const err = document.getElementById(`err-${f.id}`);
        if (!el.value.trim()) {
            el.classList.add('error');
            err.textContent = f.msg;
            valid = false;
        } else {
            el.classList.add('success');
        }
    });

    // Validate email format if provided
    const emailEl = document.getElementById('email');
    if (emailEl.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailEl.value)) {
            emailEl.classList.add('error');
            document.getElementById('err-email').textContent = 'Enter a valid email address';
            valid = false;
        }
    }

    return valid;
};

// ─────────────────────────────────────────
// HANDLE FORM SUBMIT — Enroll new student
// ─────────────────────────────────────────
const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const formData = {
        first_name: document.getElementById('first_name').value.trim(),
        last_name:  document.getElementById('last_name').value.trim(),
        email:      document.getElementById('email').value.trim(),
        phone:      document.getElementById('phone').value.trim(),
        batch:      document.getElementById('batch').value,
        year:       parseInt(document.getElementById('year').value),
    };

    try {
        const res  = await fetch(`${API}/enrollment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok) {
            showAlert(`${formData.first_name} ${formData.last_name} enrolled successfully!`);
            document.getElementById('enrollmentForm').reset();

            // Clear all field states
            ['first_name','last_name','email','batch','year'].forEach(id => {
                document.getElementById(id).classList.remove('success', 'error');
            });

            // Reload students list
            loadStudents();
        } else {
            showAlert(data.message || 'Enrollment failed. Please try again.', 'danger');
        }

    } catch (err) {
        showAlert('Server is offline. Please make sure the backend is running.', 'danger');
    } finally {
        setLoading(false);
    }
};

// ─────────────────────────────────────────
// RENDER STUDENTS TABLE
// Only shows real students from the backend
// ─────────────────────────────────────────
const renderTable = (students) => {
    const wrapper    = document.getElementById('tableWrapper');
    const countEl    = document.getElementById('studentCount');

    countEl.innerHTML = `Showing <span>${students.length}</span> of
        <span>${allStudents.length}</span> student${allStudents.length !== 1 ? 's' : ''}`;

    if (!students || students.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">👨‍🎓</div>
                <h3>${allStudents.length === 0
                    ? 'No Students Enrolled Yet'
                    : 'No Students Match Your Search'
                }</h3>
                <p>${allStudents.length === 0
                    ? 'Use the form on the left to enroll the first student.'
                    : 'Try adjusting your search or filter.'
                }</p>
            </div>`;
        return;
    }

    wrapper.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Batch</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Enrolled</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((s, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>
                            <strong>${s.first_name} ${s.last_name}</strong>
                            ${s.email
                                ? `<br><span style="font-size:11px;color:var(--text-3);">${s.email}</span>`
                                : ''
                            }
                        </td>
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
                                <button class="action-btn edit"
                                    onclick="openEditModal(${s.id})">
                                    ✏️ Edit
                                </button>
                                <button class="action-btn id-card"
                                    onclick="generateIdCard(${s.id})">
                                    🪪 ID
                                </button>
                                <button class="action-btn cert"
                                    onclick="generateCert(${s.id})">
                                    📜 Cert
                                </button>
                                <button class="action-btn delete"
                                    onclick="deleteStudent(${s.id}, '${s.first_name} ${s.last_name}')">
                                    🗑️ Del
                                </button>
                            </div>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
};

// ─────────────────────────────────────────
// LOAD STUDENTS FROM BACKEND
// ─────────────────────────────────────────
const loadStudents = async () => {
    const wrapper = document.getElementById('tableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading students...</p>
        </div>`;

    try {
        const res  = await fetch(`${API}/enrollment`);
        const data = await res.json();

        allStudents      = data.students || [];
        filteredStudents = [...allStudents];

        applyFilters();

    } catch (err) {
        wrapper.innerHTML = `
            <div class="error-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Students</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

// ─────────────────────────────────────────
// APPLY FILTERS & SEARCH
// ─────────────────────────────────────────
const applyFilters = () => {
    const search    = document.getElementById('studentSearch').value.toLowerCase().trim();
    const batch     = document.getElementById('batchFilter').value;
    const year      = document.getElementById('yearFilter').value;

    filteredStudents = allStudents.filter(s => {
        const matchSearch = !search ||
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) ||
            (s.email && s.email.toLowerCase().includes(search));

        const matchBatch = !batch || s.batch === batch;
        const matchYear  = !year  || String(s.year) === year;

        return matchSearch && matchBatch && matchYear;
    });

    renderTable(filteredStudents);
};

// ─────────────────────────────────────────
// OPEN EDIT MODAL
// ─────────────────────────────────────────
const openEditModal = (id) => {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    const overlay = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');

    content.innerHTML = `
        <div class="modal-header">
            <h3>✏️ Edit Student</h3>
            <button class="modal-close-btn" onclick="closeEditModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="editAlertContainer"></div>
            <div class="form-row">
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" id="edit_first_name"
                        value="${student.first_name}" />
                </div>
                <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" id="edit_last_name"
                        value="${student.last_name}" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="edit_email"
                        value="${student.email || ''}" />
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="edit_phone"
                        value="${student.phone || ''}" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Batch *</label>
                    <select id="edit_batch">
                        <option value="Batch-A" ${student.batch === 'Batch-A' ? 'selected' : ''}>Batch A</option>
                        <option value="Batch-B" ${student.batch === 'Batch-B' ? 'selected' : ''}>Batch B</option>
                        <option value="Batch-C" ${student.batch === 'Batch-C' ? 'selected' : ''}>Batch C</option>
                        <option value="Batch-D" ${student.batch === 'Batch-D' ? 'selected' : ''}>Batch D</option>
                        <option value="Batch-E" ${student.batch === 'Batch-E' ? 'selected' : ''}>Batch E</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Year *</label>
                    <select id="edit_year">
                        <option value="2023" ${student.year === 2023 ? 'selected' : ''}>2023</option>
                        <option value="2024" ${student.year === 2024 ? 'selected' : ''}>2024</option>
                        <option value="2025" ${student.year === 2025 ? 'selected' : ''}>2025</option>
                        <option value="2026" ${student.year === 2026 ? 'selected' : ''}>2026</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="edit_status">
                    <option value="active"    ${student.status === 'active'    ? 'selected' : ''}>Active</option>
                    <option value="completed" ${student.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="withdrawn" ${student.status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
                </select>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm"
                onclick="closeEditModal()">
                Cancel
            </button>
            <button class="btn btn-orange btn-sm"
                onclick="saveEdit(${id})">
                💾 Save Changes
            </button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeEditModal();
    });
};

// ─────────────────────────────────────────
// SAVE EDIT
// ─────────────────────────────────────────
const saveEdit = async (id) => {
    const updatedData = {
        first_name: document.getElementById('edit_first_name').value.trim(),
        last_name:  document.getElementById('edit_last_name').value.trim(),
        email:      document.getElementById('edit_email').value.trim(),
        phone:      document.getElementById('edit_phone').value.trim(),
        batch:      document.getElementById('edit_batch').value,
        year:       parseInt(document.getElementById('edit_year').value),
        status:     document.getElementById('edit_status').value,
    };

    if (!updatedData.first_name || !updatedData.last_name) {
        document.getElementById('editAlertContainer').innerHTML = `
            <div class="alert alert-danger">❌ First and last name are required.</div>`;
        return;
    }

    try {
        const res  = await fetch(`${API}/enrollment/${id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(updatedData)
        });

        const data = await res.json();

        if (res.ok) {
            closeEditModal();
            showAlert('Student updated successfully!');
            loadStudents();
        } else {
            document.getElementById('editAlertContainer').innerHTML = `
                <div class="alert alert-danger">❌ ${data.message}</div>`;
        }

    } catch (err) {
        document.getElementById('editAlertContainer').innerHTML = `
            <div class="alert alert-danger">❌ Server error. Try again.</div>`;
    }
};

// ─────────────────────────────────────────
// CLOSE EDIT MODAL
// ─────────────────────────────────────────
const closeEditModal = () => {
    document.getElementById('editModal').style.display = 'none';
    document.body.style.overflow = '';
};

// ─────────────────────────────────────────
// DELETE STUDENT
// ─────────────────────────────────────────
const deleteStudent = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API}/enrollment/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            showAlert(`${name} has been removed.`);
            loadStudents();
        } else {
            showAlert(data.message || 'Delete failed.', 'danger');
        }

    } catch (err) {
        showAlert('Server error. Please try again.', 'danger');
    }
};

// ─────────────────────────────────────────
// GENERATE ID CARD
// Opens PDF in new tab
// ─────────────────────────────────────────
const generateIdCard = (id) => {
    window.open(`${API}/generate/idcard/student/${id}`, '_blank');
};

// ─────────────────────────────────────────
// GENERATE CERTIFICATE
// Opens PDF in new tab
// ─────────────────────────────────────────
const generateCert = (id) => {
    window.open(`${API}/generate/certificate/${id}`, '_blank');
};

// ─────────────────────────────────────────
// EXPORT STUDENTS TO CSV
// ─────────────────────────────────────────
const exportStudents = () => {
    const batch = document.getElementById('batchFilter').value;
    const year  = document.getElementById('yearFilter').value;

    let url = `${API}/enrollment/export`;
    const params = [];
    if (batch) params.push(`batch=${batch}`);
    if (year)  params.push(`year=${year}`);
    if (params.length) url += `?${params.join('&')}`;

    window.open(url, '_blank');
};

// ─────────────────────────────────────────
// CLOSE MODAL WITH ESCAPE KEY
// ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
});

// ─────────────────────────────────────────
// EVENT LISTENERS — search and filters
// ─────────────────────────────────────────
document.getElementById('enrollmentForm')
    .addEventListener('submit', handleSubmit);

document.getElementById('studentSearch')
    .addEventListener('input', applyFilters);

document.getElementById('batchFilter')
    .addEventListener('change', applyFilters);

document.getElementById('yearFilter')
    .addEventListener('change', applyFilters);

// ─────────────────────────────────────────
// RUN
// ─────────────────────────────────────────
loadStudents();