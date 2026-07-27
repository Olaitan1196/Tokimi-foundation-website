import { API_BASE_URL } from './api.js';

const loadStats = async () => {
    const grid = document.getElementById('statsGrid');
    try {
        const res  = await fetch(`${API_BASE_URL}/scholarship/stats/public`);
        const data = await res.json();

        grid.innerHTML = `
            <div class="summary-card">
                <div class="summary-icon blue">🏫</div>
                <div class="summary-info">
                    <h3>${data.schools_benefited}</h3>
                    <p>Schools Benefited</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon orange">🎓</div>
                <div class="summary-info">
                    <h3>${data.total_scholarships}</h3>
                    <p>Scholarships Awarded</p>
                </div>
            </div>`;
    } catch (err) {
        grid.innerHTML = `
            <div class="error-state" style="grid-column:1/-1;">
                <div class="ei">⚠️</div>
                <h3>Could Not Load Stats</h3>
            </div>`;
    }
};

loadStats();