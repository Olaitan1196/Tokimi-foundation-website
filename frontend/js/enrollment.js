import { API_BASE_URL } from './api.js';

const showAlert = (containerId, message, type = 'success') => {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${type === 'success' ? '✅' : '❌'} ${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
};

// ── Populate school/class dropdowns from lookup API ──
const loadLookups = async () => {
    try {
        const [schoolsRes, classesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/lookup/computer-training-schools`),
            fetch(`${API_BASE_URL}/lookup/computer-training-classes`)
        ]);
        const schools = await schoolsRes.json();
        const classes = await classesRes.json();

        const schoolOptions = schools.entries.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        const classOptions  = classes.entries.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        document.getElementById('school_id').insertAdjacentHTML('beforeend', schoolOptions);
        document.getElementById('class_id').insertAdjacentHTML('beforeend', classOptions);
        document.getElementById('chk_school_id').insertAdjacentHTML('beforeend', schoolOptions);
    } catch (err) {
        console.error('Failed to load schools/classes', err);
    }
};

// ── Enrollment form submit ──
const handleSubmit = async (e, overrideDuplicate = false) => {
    e.preventDefault();

    const formData = {
        first_name:  document.getElementById('first_name').value.trim(),
        middle_name: document.getElementById('middle_name').value.trim(),
        last_name:   document.getElementById('last_name').value.trim(),
        gender:      document.getElementById('gender').value,
        email:       document.getElementById('email').value.trim(),
        phone:       document.getElementById('phone').value.trim(),
        address:     document.getElementById('address').value.trim(),
        school_id:   document.getElementById('school_id').value,
        class_id:    document.getElementById('class_id').value,
        batch:       document.getElementById('batch').value,
        year:        parseInt(document.getElementById('year').value),
        month:       document.getElementById('month').value,
        override_duplicate: overrideDuplicate
    };

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Enrolling...';

    try {
        const res = await fetch(`${API_BASE_URL}/enrollment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();

        if (res.status === 409) {
            const proceed = confirm(`⚠️ ${data.message}\n\nClick OK to enroll anyway, or Cancel to review.`);
            if (proceed) return handleSubmit(e, true);
            return;
        }

        if (res.ok) {
            showAlert('alertContainer', `${formData.first_name} ${formData.last_name} enrolled successfully!`);
            document.getElementById('enrollmentForm').reset();
        } else {
            showAlert('alertContainer', data.message || 'Enrollment failed.', 'danger');
        }
    } catch (err) {
        showAlert('alertContainer', 'Server is offline. Please try again later.', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '🎓 Enroll Student';
    }
};

// ── Check status form submit ──
const handleStatusCheck = async (e) => {
    e.preventDefault();

    const params = new URLSearchParams({
        first_name: document.getElementById('chk_first_name').value.trim(),
        last_name:  document.getElementById('chk_last_name').value.trim(),
        school_id:  document.getElementById('chk_school_id').value,
        year:       document.getElementById('chk_year').value,
        month:      document.getElementById('chk_month').value
    });

    const resultWrapper = document.getElementById('statusResultWrapper');
    resultWrapper.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Checking...</p></div>';

    try {
        const res = await fetch(`${API_BASE_URL}/enrollment/check-status?${params}`);
        const data = await res.json();

        if (!res.ok) {
            resultWrapper.innerHTML = '';
            showAlert('statusAlertContainer', data.message, 'danger');
            return;
        }

        resultWrapper.innerHTML = data.results.map(s => `
            <div class="status-result-card">
                <strong>${s.first_name} ${s.middle_name || ''} ${s.last_name}</strong><br>
                School: ${s.school_name}<br>
                Class: ${s.class_name}<br>
                Batch: ${s.batch} | ${s.month} ${s.year}<br>
                Status: <span class="status-badge status-${s.status}">${s.status}</span>
            </div>
        `).join('');
    } catch (err) {
        resultWrapper.innerHTML = '';
        showAlert('statusAlertContainer', 'Server is offline. Please try again later.', 'danger');
    }
};

document.getElementById('enrollmentForm').addEventListener('submit', handleSubmit);
document.getElementById('statusCheckForm').addEventListener('submit', handleStatusCheck);

loadLookups();