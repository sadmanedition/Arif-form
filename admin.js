/**
 * ADMIN DASHBOARD CONTROLLER
 * Handles authentication, fetching data from n8n, and UI updates.
 */

const API_URL = 'https://n8n.srv1106977.hstgr.cloud/webhook/studentsubmit';

// State
let authToken = localStorage.getItem('adminToken') || null;
let leadsData = [];

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // Check if we are on the dashboard page
    // In a real SPA we'd check URL or body class. checking if table exists:
    if (document.getElementById('leadsTable')) {
        if (!authToken) {
            window.location.href = 'admin.html';
        } else {
            initDashboard();
        }
    }

    if (loginForm) {
        // Redirect if already logged in
        if (authToken) {
            window.location.href = 'dashboard.html';
        }
        initLogin(loginForm);
    }
});

function initLogin(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value.trim();
        const btn = document.getElementById('loginBtn');
        const errorMsg = document.getElementById('loginError');

        // 1. Start Animation
        btn.classList.add('loading');
        errorMsg.textContent = '';
        errorMsg.classList.remove('show');

        // 2. Wait for Animation (2.8s)
        await new Promise(r => setTimeout(r, 2800));

        try {
            // Verify password via API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auth',
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.message || 'Invalid Password');
            }

            // Success
            localStorage.setItem('adminToken', password);
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error(error);
            errorMsg.textContent = error.message === 'Failed to fetch' ? 'Connection error' : error.message;
            errorMsg.classList.add('show');
            // Reset Animation on failure
            btn.classList.remove('loading');
        }
    });
}

async function initDashboard() {
    // Initial Fetch
    try {
        await fetchLeads();
    } catch (error) {
        console.error("Failed to load dashboard", error);
        if (error.message.includes('Auth')) {
            logout();
        }
    }
}

async function fetchLeads() {
    const tableLoading = document.getElementById('tableLoading');
    const table = document.getElementById('leadsTable');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get',
                password: authToken
            })
        });

        const text = await response.text();
        console.log('Raw Admin API Response:', text); // Debug log

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
        }

        if (data.error) throw new Error(data.message);

        let leads = data.leads;

        // Safety: If leads exists but is not an array (e.g. single object from n8n), wrap it
        if (leads && !Array.isArray(leads)) {
            console.warn('Received non-array leads, wrapping in array:', leads);
            leads = [leads];
        }

        leadsData = leads || [];
        renderTable(leadsData);
        updateStats(leadsData);
        initChart(leadsData);
        initLevelChart(leadsData); // Initialize Pie Chart

        tableLoading.style.display = 'none';
        table.style.display = 'table';

    } catch (error) {
        tableLoading.textContent = 'Error loading data: ' + error.message;
        // if auth error
        if (error.message.toLowerCase().includes('password')) {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin.html';
        }
    }
}

function renderTable(leads) {
    const tbody = document.getElementById('leadsBody');
    tbody.innerHTML = '';

    // Sort by date desc (assuming timestamp exists)
    // Safety check: ensure leads is an array
    if (!Array.isArray(leads)) {
        console.error("renderTable called with non-array:", leads);
        return;
    }

    const sorted = [...leads].reverse();

    sorted.forEach((lead, index) => {
        const tr = document.createElement('tr');

        // Normalize keys (Handle n8n Capitalized Keys)
        // Try camelCase then TitleCase
        const dateRaw = lead.timestamp || lead.Timestamp;
        const nameRaw = lead.fullName || lead.name || lead.Name || lead['Full Name'] || 'Unknown';
        const emailRaw = lead.email || lead.Email || '';
        const phoneRaw = lead.phone || lead.Phone || '-';
        const levelRaw = lead.languageLevel || lead.language_level || lead.Level || lead['Language Level'] || 'N/A';
        const emailStatus = lead['Email Status'] || 'Pending';

        const date = dateRaw ? new Date(dateRaw).toLocaleDateString() : 'N/A';

        // Status Badge Logic
        let statusClass = 'status-new'; // default blue
        if (emailStatus.includes('Sent')) statusClass = 'status-converted'; // green
        if (emailStatus.includes('Failed')) statusClass = 'status-contacted'; // orange

        tr.innerHTML = `
            <td>${date}</td>
            <td>${nameRaw}</td>
            <td>${emailRaw}</td>
            <td>${phoneRaw}</td>
            <td><span class="status-badge status-new">${levelRaw}</span></td>
            <td><span class="status-badge ${statusClass}">${emailStatus}</span></td>
            <td>
                <button class="action-btn" onclick="deleteLead('${emailRaw}')" style="color:red">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(leads) {
    const total = leads.length;
    // Simple stats: Total
    document.querySelectorAll('.stat-value')[0].textContent = total;

    // Normalization helper
    const getLevel = (l) => l.languageLevel || l.Level || l['Language Level'] || '';
    const getDate = (l) => l.timestamp || l.Timestamp || null;

    // Calc A1 users
    // Matches "A1", "A1 ", "Beginner (A1)" etc.
    const a1Count = leads.filter(l => getLevel(l).toUpperCase().includes('A1')).length;
    const a1Percent = total > 0 ? Math.round((a1Count / total) * 100) : 0;
    document.querySelectorAll('.stat-value')[2].textContent = a1Percent + '%';

    // Today
    const todayStr = new Date().toDateString(); // "Fri Jan 17 2026"
    const todayCount = leads.filter(l => {
        const raw = getDate(l);
        if (!raw) return false;
        // Compare just the date part, ignore time
        return new Date(raw).toDateString() === todayStr;
    }).length;

    document.querySelectorAll('.stat-value')[1].textContent = todayCount;
}

async function deleteLead(email) {
    if (!confirm('Are you sure you want to delete ' + email + '?')) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                password: authToken,
                email: email
            })
        });

        await fetchLeads(); // Refresh
    } catch (e) {
        alert('Delete failed: ' + e.message);
    }
}

// ==========================
// CHART LOGIC
// ==========================
let growthChartInstance = null;
let currentChartData = [];

function initChart(leads) {
    currentChartData = leads;
    updateChartFilter('7'); // Default to 7 days
}

function updateChartFilter(days) {
    const canvas = document.getElementById('growthChart');
    if (!canvas) return;

    // Filter Logic
    let filteredData = [];
    const now = new Date();

    if (days === 'all') {
        filteredData = currentChartData;
    } else {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - parseInt(days));
        filteredData = currentChartData.filter(l => {
            const d = l.timestamp || l.Timestamp;
            return d && new Date(d) >= cutoff;
        });
    }

    // Aggregation: Group by Date
    // Format: "Jan 17"
    const grouped = {};
    // Pre-fill last N days if not 'all' to show empty days? 
    // For simplicity, just show active days sorted.

    filteredData.forEach(l => {
        const d = l.timestamp || l.Timestamp;
        if (!d) return;
        const dateStr = new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    });

    // Sort by Date
    // Current simple approach: relying on string sort isn't great, better to sort keys by time
    // But since object order isn't guaranteed, let's map to array and sort

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        // This is a hacky sort for "Jan 1", better to rely on fresh date parsing or keeping timestamp
        return new Date(a + " " + new Date().getFullYear()) - new Date(b + " " + new Date().getFullYear());
    });

    // Safety: if empty, show today
    if (sortedKeys.length === 0) {
        const todayKey = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        sortedKeys.push(todayKey);
        grouped[todayKey] = 0;
    }

    const labels = sortedKeys;
    const dataPoints = sortedKeys.map(k => grouped[k] || 0);

    renderChart(labels, dataPoints);
}

function renderChart(labels, data) {
    const ctx = document.getElementById('growthChart').getContext('2d');

    // Premium Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 114, 206, 0.5)'); // Estonian Blue
    gradient.addColorStop(1, 'rgba(0, 114, 206, 0.0)');

    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Leads',
                data: data,
                borderColor: '#0072CE',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0072CE',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

let levelChartInstance = null;

function initLevelChart(leads) {
    const ctx = document.getElementById('levelChart').getContext('2d');

    // 1. Process Data
    const levelCounts = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'Other': 0 };

    leads.forEach(l => {
        const raw = (l.languageLevel || l.Level || l['Language Level'] || '').toUpperCase();
        if (raw.includes('A1')) levelCounts['A1']++;
        else if (raw.includes('A2')) levelCounts['A2']++;
        else if (raw.includes('B1')) levelCounts['B1']++;
        else if (raw.includes('B2')) levelCounts['B2']++;
        else levelCounts['Other']++;
    });

    const dataValues = [levelCounts.A1, levelCounts.A2, levelCounts.B1, levelCounts.B2, levelCounts.Other];
    const labels = ['A1 (Beginner)', 'A2 (Elementary)', 'B1 (Intermediate)', 'B2 (Upper)', 'Other'];

    // 2. Render Chart
    if (levelChartInstance) levelChartInstance.destroy();

    levelChartInstance = new Chart(ctx, {
        type: 'doughnut', // Looks more premium than simple Pie
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#0072CE', // Estonian Blue
                    '#4185f2', // Lighter Blue
                    '#004B87', // Darker Blue
                    '#000000', // Black (Accent)
                    '#e0e0e0'  // Grey
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        font: { size: 10 },
                        padding: 15
                    }
                }
            },
            cutout: '60%' // Doughnut thickness
        }
    });
}


// ==========================
// TABS & UI LOGIC
// ==========================
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Show selected
    document.getElementById(tabName + '-tab').classList.add('active');

    // Update Nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + tabName).classList.add('active');
}

// ==========================
// EXPORT CSV
// ==========================
function exportCSV() {
    if (!currentChartData || currentChartData.length === 0) {
        alert("No data to export");
        return;
    }

    // Define Headers
    const headers = ["Timestamp", "Name", "Email", "Phone", "Level", "Email Status"];

    // Convert to CSV string
    const csvRows = [headers.join(',')];

    currentChartData.forEach(l => {
        const row = [
            l.timestamp || l.Timestamp || '',
            l.fullName || l.Name || '',
            l.email || l.Email || '',
            l.phone || l.Phone || '',
            l.languageLevel || l.Level || '',
            l['Email Status'] || 'Pending'
        ];
        // Escape quotes and commas if needed
        const diffRow = row.map(str => `"${String(str).replace(/"/g, '""')}"`);
        csvRows.push(diffRow.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function animateLogout() {
    console.log("Logout clicked"); // Debug
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.classList.add('loading');

    setTimeout(() => {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin.html';
    }, 2800);
}
