// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'https://tokimi-foundation-website-production.up.railway.app/api';
const SERVER = 'https://tokimi-foundation-website-production.up.railway.app';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let allRecords      = [];
let filteredRecords = [];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
});

const fmtCurrency = amount =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency', currency: 'NGN'
    }).format(amount);

const showAlert = (message, type = 'success') => {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type}">
            ${type === 'success' ? '✅' : '❌'} ${message}
        </div>`;
    setTimeout(() => container.innerHTML = '', 4000);
};

const setLoading = (loading) => {
    const btn       = document.getElementById('submitBtn');
    btn.disabled    = loading;
    btn.textContent = loading ? '⏳ Awarding...' : '🏆 Award Scholarship';
};

// ─────────────────────────────────────────
// LOAD SUMMARY CARDS
// Fetches real totals from backend
// ─────────────────────────────────────────
const loadSummary = async () => {
    const grid = document.getElementById('summaryGrid');
    try {
        const res  = await fetch(`${API}/scholarship`);
        const data = await res.json();

        const scholarships = (data.scholarships || [])
            .filter(s => s.type === 'scholarship');
        const grants = (data.scholarships || [])
            .filter(s => s.type === 'grant');

        const totalScholarshipAmt = scholarships
            .reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const totalGrantAmt = grants
            .reduce((sum, s) => sum + parseFloat(s.amount), 0);

        grid.innerHTML = `
            <div class="summary-card">
                <div class="summary-icon blue">🏆</div>
                <div class="summary-info">
                    <h3>${data.total || 0}</h3>
                    <p>Total Awards</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon orange">🎓</div>
                <div class="summary-info">
                    <h3>${scholarships.length}</h3>
                    <p>Scholarships</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon purple">🤝</div>
                <div class="summary-info">
                    <h3>${grants.length}</h3>
                    <p>Grants</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon green">💰</div>
                <div class="summary-info">
                    <h3>₦${Number(data.totalAmount || 0).toLocaleString()}</h3>
                    <p>Total Awarded</p>
                </div>
            </div>`;

    } catch (err) {
        grid.innerHTML = `
            <div class="error-state">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Summary</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

// ─────────────────────────────────────────
// LOAD STUDENTS INTO SELECT DROPDOWN
// Fetches enrolled students for selection
// ─────────────────────────────────────────
const loadStudentOptions = async () => {
    const select = document.getElementById('student_id');
    try {
        const res  = await fetch(`${API}/enrollment`);
        const data = await res.json();

        if (!data.students || data.students.length === 0) {
            select.innerHTML = `
                <option value="">-- No students enrolled yet --</option>`;
            return;
        }

        select.innerHTML = `
            <option value="">-- Select Enrolled Student --</option>
            ${data.students.map(s => `
                <option value="${s.id}">
                    ${s.first_name} ${s.last_name} — ${s.batch} (${s.year})
                </option>`).join('')}`;

    } catch (err) {
        select.innerHTML = `
            <option value="">-- Could not load students --</option>`;
    }
};

// ─────────────────────────────────────────
// VALIDATE FORM
// ─────────────────────────────────────────
const validateForm = () => {
    let valid = true;

    const fields = [
        { id: 'student_id',   msg: 'Please select a student' },
        { id: 'type',         msg: 'Please select award type' },
        { id: 'amount',       msg: 'Amount is required' },
        { id: 'date_awarded', msg: 'Date awarded is required' },
    ];

    fields.forEach(f => {
        document.getElementById(f.id).classList.remove('error');
        const errEl = document.getElementById(`err-${f.id}`);
        if (errEl) errEl.textContent = '';
    });

    fields.forEach(f => {
        const el    = document.getElementById(f.id);
        const errEl = document.getElementById(`err-${f.id}`);
        if (!el.value.trim()) {
            el.classList.add('error');
            if (errEl) errEl.textContent = f.msg;
            valid = false;
        }
    });

    // Amount must be positive
    const amountEl = document.getElementById('amount');
    if (amountEl.value && parseFloat(amountEl.value) <= 0) {
        amountEl.classList.add('error');
        document.getElementById('err-amount').textContent =
            'Amount must be greater than zero';
        valid = false;
    }

    return valid;
};

// ─────────────────────────────────────────
// HANDLE FORM SUBMIT
// Awards a scholarship or grant
// ─────────────────────────────────────────
const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const formData = {
        student_id:   parseInt(document.getElementById('student_id').value),
        type:         document.getElementById('type').value,
        amount:       parseFloat(document.getElementById('amount').value),
        description:  document.getElementById('description').value.trim(),
        date_awarded: document.getElementById('date_awarded').value,
    };

    try {
        const res  = await fetch(`${API}/scholarship`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok) {
            showAlert(data.message || 'Award recorded successfully!');
            document.getElementById('scholarshipForm').reset();
            loadSummary();
            loadRecords();
        } else {
            showAlert(data.message || 'Failed to record award.', 'danger');
        }

    } catch (err) {
        showAlert('Server is offline. Please make sure the backend is running.', 'danger');
    } finally {
        setLoading(false);
    }
};

// ─────────────────────────────────────────
// RENDER TABLE
// Only shows real records from backend
// ─────────────────────────────────────────
const renderTable = (records) => {
    const wrapper  = document.getElementById('tableWrapper');
    const countEl  = document.getElementById('recordCount');

    countEl.innerHTML = `Showing <span>${records.length}</span> of
        <span>${allRecords.length}</span> record${allRecords.length !== 1 ? 's' : ''}`;

    if (!records || records.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state" style="border:none;">
                <div class="ei">🏆</div>
                <h3>${allRecords.length === 0
                    ? 'No Awards Recorded Yet'
                    : 'No Records Match Your Search'
                }</h3>
                <p>${allRecords.length === 0
                    ? 'Use the form on the left to record the first scholarship or grant.'
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
                    <th>Student</th>
                    <th>Batch</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date Awarded</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${records.map((r, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>
                            <strong>${r.first_name} ${r.last_name}</strong>
                            ${r.email
                                ? `<br><span style="font-size:11px;color:var(--text-3);">
                                    ${r.email}</span>`
                                : ''
                            }
                        </td>
                        <td>${r.batch} (${r.year})</td>
                        <td>
                            <span class="type-badge type-${r.type}">
                                ${r.type === 'scholarship' ? '🎓' : '🤝'} ${r.type}
                            </span>
                        </td>
                        <td class="amount-cell">${fmtCurrency(r.amount)}</td>
                        <td>${fmtDate(r.date_awarded)}</td>
                        <td>
                            <div class="action-btns">
                                <button class="action-btn edit"
                                    onclick="openEditModal(${r.id})">
                                    ✏️ Edit
                                </button>
                                <button class="action-btn delete"
                                    onclick="deleteRecord(${r.id},
                                    '${r.first_name} ${r.last_name}')">
                                    🗑️ Del
                                </button>
                            </div>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
};

// ─────────────────────────────────────────
// LOAD RECORDS FROM BACKEND
// ─────────────────────────────────────────
const loadRecords = async () => {
    const wrapper = document.getElementById('tableWrapper');
    wrapper.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading records...</p>
        </div>`;

    try {
        const res  = await fetch(`${API}/scholarship`);
        const data = await res.json();

        allRecords      = data.scholarships || [];
        filteredRecords = [...allRecords];

        applyFilters();

    } catch (err) {
        wrapper.innerHTML = `
            <div class="error-state" style="border:none;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Records</h3>
                <p>Make sure the backend server is running.</p>
            </div>`;
    }
};

// ─────────────────────────────────────────
// APPLY FILTERS
// ─────────────────────────────────────────
const applyFilters = () => {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const type   = document.getElementById('typeFilter').value;

    filteredRecords = allRecords.filter(r => {
        const matchSearch = !search ||
            `${r.first_name} ${r.last_name}`.toLowerCase().includes(search);
        const matchType   = !type || r.type === type;
        return matchSearch && matchType;
    });

    renderTable(filteredRecords);
};

// ─────────────────────────────────────────
// OPEN EDIT MODAL
// ─────────────────────────────────────────
const openEditModal = (id) => {
    const record  = allRecords.find(r => r.id === id);
    if (!record) return;

    const overlay = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');

    // Format date for input field
    const dateForInput = new Date(record.date_awarded)
        .toISOString().split('T')[0];

    content.innerHTML = `
        <div class="modal-header">
            <h3>✏️ Edit Award</h3>
            <button class="modal-close-btn" onclick="closeEditModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="editAlertContainer"></div>
            <div class="form-group">
                <label>Student</label>
                <input type="text"
                    value="${record.first_name} ${record.last_name}"
                    disabled
                    style="background:var(--bg);color:var(--text-2);"
                />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Award Type *</label>
                    <select id="edit_type">
                        <option value="scholarship"
                            ${record.type === 'scholarship' ? 'selected' : ''}>
                            🎓 Scholarship
                        </option>
                        <option value="grant"
                            ${record.type === 'grant' ? 'selected' : ''}>
                            🤝 Grant
                        </option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (₦) *</label>
                    <input type="number" id="edit_amount"
                        value="${record.amount}" min="0" />
                </div>
            </div>
            <div class="form-group">
                <label>Date Awarded *</label>
                <input type="date" id="edit_date_awarded"
                    value="${dateForInput}" />
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit_description" rows="3">${record.description || ''}</textarea>
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
        type:         document.getElementById('edit_type').value,
        amount:       parseFloat(document.getElementById('edit_amount').value),
        date_awarded: document.getElementById('edit_date_awarded').value,
        description:  document.getElementById('edit_description').value.trim(),
    };

    if (!updatedData.type || !updatedData.amount || !updatedData.date_awarded) {
        document.getElementById('editAlertContainer').innerHTML = `
            <div class="alert alert-danger">❌ All required fields must be filled.</div>`;
        return;
    }

    if (updatedData.amount <= 0) {
        document.getElementById('editAlertContainer').innerHTML = `
            <div class="alert alert-danger">❌ Amount must be greater than zero.</div>`;
        return;
    }

    try {
        const res  = await fetch(`${API}/scholarship/${id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(updatedData)
        });

        const data = await res.json();

        if (res.ok) {
            closeEditModal();
            showAlert('Award updated successfully!');
            loadSummary();
            loadRecords();
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
// DELETE RECORD
// ─────────────────────────────────────────
const deleteRecord = async (id, name) => {
    if (!confirm(
        `Are you sure you want to delete the award for ${name}? This cannot be undone.`
    )) return;

    try {
        const res  = await fetch(`${API}/scholarship/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            showAlert(`Award for ${name} has been removed.`);
            loadSummary();
            loadRecords();
        } else {
            showAlert(data.message || 'Delete failed.', 'danger');
        }

    } catch (err) {
        showAlert('Server error. Please try again.', 'danger');
    }
};

// ─────────────────────────────────────────
// EXPORT TO CSV
// ─────────────────────────────────────────
const exportScholarships = () => {
    window.open(`${API}/scholarship/export`, '_blank');
};

// ─────────────────────────────────────────
// CLOSE MODAL WITH ESCAPE KEY
// ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
});

// ─────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────
document.getElementById('scholarshipForm')
    .addEventListener('submit', handleSubmit);

document.getElementById('searchInput')
    .addEventListener('input', applyFilters);

document.getElementById('typeFilter')
    .addEventListener('change', applyFilters);

// ─────────────────────────────────────────
// RUN EVERYTHING
// ─────────────────────────────────────────
loadSummary();
loadStudentOptions();
loadRecords();