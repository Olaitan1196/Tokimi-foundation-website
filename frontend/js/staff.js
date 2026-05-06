// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API    = 'https://tokimi-foundation-website-production.up.railway.app/api';
const SERVER = 'https://tokimi-foundation-website-production.up.railway.app';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let allStaff      = [];
let filteredStaff = [];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
});

const emptyHTML = (icon, title, msg) => `
    <div class="empty-state">
        <div class="ei">${icon}</div>
        <h3>${title}</h3>
        <p>${msg}</p>
    </div>`;

const errorHTML = msg => `
    <div class="error-state">
        <div class="ei">⚠️</div>
        <h3>Could Not Load Staff</h3>
        <p>${msg}</p>
    </div>`;

// ─────────────────────────────────────────
// RENDER STAFF CARDS
// Only shows real staff from the backend
// Empty state shown if no staff added yet
// ─────────────────────────────────────────
const renderStaff = (staffList) => {
    const grid    = document.getElementById('staffGrid');
    const countBar = document.getElementById('countBar');

    // Update count bar
    countBar.innerHTML = `Showing <span>${staffList.length}</span> of
        <span>${allStaff.length}</span> staff member${allStaff.length !== 1 ? 's' : ''}`;

    if (!staffList || staffList.length === 0) {
        grid.innerHTML = emptyHTML(
            '👥',
            'No Staff Members Found',
            allStaff.length === 0
                ? 'Staff profiles will appear here once added by the admin.'
                : 'No staff match your current filter or search.'
        );
        return;
    }

    grid.innerHTML = staffList.map(member => `
        <div class="staff-card" onclick="openModal(${member.id})">
            <div class="staff-photo">
                ${member.photo_url
                    ? `<img src="${SERVER}${member.photo_url}"
                            alt="${member.first_name} ${member.last_name}">`
                    : '👤'
                }
                ${member.department
                    ? `<span class="staff-dept-badge">${member.department}</span>`
                    : ''
                }
            </div>
            <div class="staff-info">
                <h3>${member.first_name} ${member.last_name}</h3>
                <div class="staff-role">${member.role}</div>
                <div class="staff-contacts">
                    ${member.email
                        ? `<div class="staff-contact-item">
                                <span>📧</span>
                                <span>${member.email}</span>
                           </div>`
                        : ''
                    }
                    ${member.phone
                        ? `<div class="staff-contact-item">
                                <span>📞</span>
                                <span>${member.phone}</span>
                           </div>`
                        : ''
                    }
                </div>
                <button class="staff-view-btn">
                    👁️ View Full Profile
                </button>
            </div>
        </div>
    `).join('');
};

// ─────────────────────────────────────────
// BUILD DEPARTMENT FILTER TABS
// Dynamically creates tabs based on what
// departments exist in the database
// ─────────────────────────────────────────
const buildDeptTabs = (staffList) => {
    const tabsContainer = document.getElementById('deptTabs');

    // Get unique departments from staff list
    const departments = [
        ...new Set(
            staffList
                .map(m => m.department)
                .filter(Boolean)
        )
    ].sort();

    // Add a tab for each department
    departments.forEach(dept => {
        const btn = document.createElement('button');
        btn.className     = 'filter-tab';
        btn.dataset.dept  = dept;
        btn.textContent   = dept;
        tabsContainer.appendChild(btn);
    });

    // Attach click events to all tabs including "All Staff"
    tabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.filter-tab')
                .forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const dept = tab.dataset.dept;

            if (dept === 'all') {
                filteredStaff = [...allStaff];
            } else {
                filteredStaff = allStaff.filter(m => m.department === dept);
            }

            // Also apply any active search
            const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
            if (searchVal) {
                filteredStaff = filteredStaff.filter(m =>
                    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchVal) ||
                    m.role.toLowerCase().includes(searchVal) ||
                    (m.department && m.department.toLowerCase().includes(searchVal))
                );
            }

            renderStaff(filteredStaff);
        });
    });
};

// ─────────────────────────────────────────
// SEARCH FUNCTIONALITY
// ─────────────────────────────────────────
const initSearch = () => {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();

        // Get active department filter
        const activeDept = document.querySelector('.filter-tab.active')?.dataset.dept || 'all';
        let base = activeDept === 'all'
            ? [...allStaff]
            : allStaff.filter(m => m.department === activeDept);

        if (!query) {
            filteredStaff = base;
        } else {
            filteredStaff = base.filter(m =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(query) ||
                m.role.toLowerCase().includes(query) ||
                (m.department && m.department.toLowerCase().includes(query)) ||
                (m.email && m.email.toLowerCase().includes(query))
            );
        }

        renderStaff(filteredStaff);
    });
};

// ─────────────────────────────────────────
// OPEN STAFF MODAL
// Shows full profile of a staff member
// ─────────────────────────────────────────
const openModal = (id) => {
    const member  = allStaff.find(m => m.id === id);
    if (!member) return;

    const overlay = document.getElementById('staffModal');
    const content = document.getElementById('staffModalContent');

    content.innerHTML = `
        <div class="modal-header">
            <button class="modal-close-btn" onclick="closeModal()">✕</button>
            <div class="modal-avatar">
                ${member.photo_url
                    ? `<img src="${SERVER}${member.photo_url}"
                            alt="${member.first_name}">`
                    : '👤'
                }
            </div>
            <div class="modal-header-info">
                <h2>${member.first_name} ${member.last_name}</h2>
                <div class="modal-role">${member.role}</div>
                <div class="modal-dept">
                    ${member.department || 'Tokimi Foundation'}
                </div>
            </div>
        </div>

        <div class="modal-body">
            ${member.department ? `
            <div class="modal-detail-row">
                <span class="modal-detail-icon">🏢</span>
                <span class="modal-detail-label">Department</span>
                <span class="modal-detail-value">${member.department}</span>
            </div>` : ''}

            ${member.email ? `
            <div class="modal-detail-row">
                <span class="modal-detail-icon">📧</span>
                <span class="modal-detail-label">Email</span>
                <span class="modal-detail-value">${member.email}</span>
            </div>` : ''}

            ${member.phone ? `
            <div class="modal-detail-row">
                <span class="modal-detail-icon">📞</span>
                <span class="modal-detail-label">Phone</span>
                <span class="modal-detail-value">${member.phone}</span>
            </div>` : ''}

            <div class="modal-detail-row">
                <span class="modal-detail-icon">📅</span>
                <span class="modal-detail-label">Joined</span>
                <span class="modal-detail-value">${fmtDate(member.created_at)}</span>
            </div>

            <div class="modal-detail-row">
                <span class="modal-detail-icon">🪪</span>
                <span class="modal-detail-label">Staff ID</span>
                <span class="modal-detail-value">
                    TKF-STAFF-${String(member.id).padStart(4, '0')}
                </span>
            </div>
        </div>

        <div class="modal-actions">
            <button class="btn btn-outline-blue btn-sm"
                onclick="generateIdCard(${member.id})">
                🪪 Generate ID Card
            </button>
            <button class="btn btn-blue btn-sm" onclick="closeModal()">
                Close
            </button>
        </div>`;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
};

// ─────────────────────────────────────────
// CLOSE MODAL
// ─────────────────────────────────────────
const closeModal = () => {
    document.getElementById('staffModal').style.display = 'none';
    document.body.style.overflow = '';
};

// Close with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ─────────────────────────────────────────
// GENERATE STAFF ID CARD
// Opens the PDF download in a new tab
// ─────────────────────────────────────────
const generateIdCard = (id) => {
    window.open(`${API}/generate/idcard/staff/${id}`, '_blank');
};

// ─────────────────────────────────────────
// LOAD ALL STAFF FROM BACKEND
// ─────────────────────────────────────────
const loadStaff = async () => {
    const grid = document.getElementById('staffGrid');

    try {
        const res  = await fetch(`${API}/staff`);
        const data = await res.json();

        allStaff      = data.staff || [];
        filteredStaff = [...allStaff];

        // Build department tabs from real data
        buildDeptTabs(allStaff);

        // Render the staff cards
        renderStaff(filteredStaff);

    } catch (err) {
        grid.innerHTML = errorHTML(
            'Server is offline. Please make sure the backend is running.'
        );
        document.getElementById('countBar').innerHTML = '';
    }
};

// ─────────────────────────────────────────
// SCROLL ANIMATION
// ─────────────────────────────────────────
const initAnimations = () => {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.staff-card').forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
};

// ─────────────────────────────────────────
// RUN EVERYTHING
// ─────────────────────────────────────────
loadStaff();
initSearch();
initAnimations();