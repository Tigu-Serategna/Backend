const API_URL = 'https://script.google.com/macros/s/AKfycbzLcoR0YzSGY-CE-h1j8G-PesV1XDtgznEkTq3b0wMRzzNlAjnpYOhM2j7H6sQaDZnT/exec'; 
if (localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');

let adminData = null; let currentTxnData = null;
let allPayments = [], allRevenue = [], allProviders = [], allTakers = [], allFeedbacks = [], allNotifications = [];

async function apiCall(action, data = {}) { 
    const formData = new URLSearchParams(); 
    formData.append('action', action); 
    for (const key in data) if (data[key] !== undefined && data[key] !== null) formData.append(key, data[key]); 
    try { 
        const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData.toString() }); 
        return await res.json(); 
    } catch (e) { 
        return { status: 'error', message: 'Network error: ' + e.message }; 
    } 
}

function switchTab(id) { 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden')); 
    document.getElementById(`content-${id}`).classList.remove('hidden'); 
    document.getElementById('page-title').innerText = id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '); 
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active')); 
    event.currentTarget.classList.add('active'); 
}

function closeModal() { document.getElementById('payment-modal').style.display = 'none'; }

function openPaymentModal(txnId) {
    const p = allPayments.find(x => x.txnId === txnId); if(!p) return;
    currentTxnData = p;
    document.getElementById('modal-phone').innerText = p.phone;
    document.getElementById('modal-plan').innerText = 'Code ' + p.plan;
    document.getElementById('modal-method').innerText = p.paymentMethod || 'N/A';
    document.getElementById('modal-amount').innerText = p.amount + ' ETB';
    document.getElementById('modal-ocr').innerText = p.extractedText || 'No text extracted.';
    document.getElementById('modal-approve-btn').onclick = () => { approvePayment(p.txnId, p.phone, p.plan); };
    document.getElementById('modal-fail-btn').onclick = () => { approvePayment(p.txnId, p.phone, 'Fail'); };
    document.getElementById('payment-modal').style.display = 'flex'; lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons(); 
    const res = await apiCall('getAdminData');
    
    if (res.status === 'success') {
        adminData = res.data;
        allPayments = adminData.payments || [];
        allRevenue = adminData.revenuePayments || [];
        allProviders = adminData.providers || [];
        allTakers = adminData.takers || [];
        allFeedbacks = adminData.feedbacks || [];
        allNotifications = adminData.notifications || [];
        
        const m = adminData.metrics;
        
        // Populate Overview Stats
        document.getElementById('adm-total-users').innerText = m.totalUsers || 0;
        document.getElementById('adm-total-orders').innerText = m.totalOrders || 0;
        document.getElementById('adm-accepted').innerText = m.acceptedOrders || 0;
        document.getElementById('adm-declined').innerText = m.declinedOrders || 0;
        document.getElementById('adm-free').innerText = m.free || 0;
        document.getElementById('adm-weekly').innerText = m.weekly || 0;
        document.getElementById('adm-monthly').innerText = m.monthly || 0;
        document.getElementById('adm-yearly').innerText = m.yearly || 0;
        document.getElementById('adm-pending').innerText = m.pending || 0;
        document.getElementById('adm-fail').innerText = m.fail || 0;
        document.getElementById('adm-revenue').innerText = (m.totalRevenue || 0) + ' ETB';

        // Render Tables
        renderPayments('All');
        renderTakers();
        renderProviders('All');
        renderRevenue();
        renderFeedbacks();
        renderNotifications();
    } else {
        alert("Backend Error: " + (res.message || "Failed to load data. Check API URL."));
    }
});

// --- RENDER PAYMENTS ---
function renderPayments(filterType, btn) {
    if(btn) { document.querySelectorAll('#content-payments .inner-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    
    let filtered = allPayments;
    if (filterType === 'Pending') filtered = allPayments.filter(p => p.status === 'Pending');
    else if (filterType === 'Approved') filtered = allPayments.filter(p => ['A','B','C','Approved'].includes(p.status));
    else if (filterType === 'Rejected') filtered = allPayments.filter(p => p.status === 'Fail' || p.status === 'Rejected');

    const tbody = document.getElementById('adm-payments-table');
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">No ${filterType.toLowerCase()} payments found.</td></tr>`; return; }

    tbody.innerHTML = filtered.map(p => {
        let isPend = p.status === 'Pending';
        let statusPill = isPend ? 'status-orange' : (['A','B','C','Approved'].includes(p.status) ? 'status-green' : 'status-red');
        let statusText = isPend ? 'Pending' : (['A','B','C','Approved'].includes(p.status) ? 'Approved' : 'Rejected');

        return `
        <tr>
            <td class="font-mono">${p.phone || 'N/A'}</td>
            <td><b>Code ${p.plan || 'N/A'}</b></td>
            <td>${p.amount || 0} ETB</td>
            <td>${p.paymentMethod || 'N/A'}</td>
            <td>${p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</td>
            <td><span class="status-pill ${statusPill}">${statusText}</span></td>
            <td><button onclick="openPaymentModal('${p.txnId}')" class="btn-action" style="background: var(--brand); color: white;">Review</button></td>
        </tr>`;
    }).join('');
}

// --- RENDER PROVIDERS ---
function renderProviders(filterType, btn) {
    if(btn) { document.querySelectorAll('#content-providers .inner-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }

    let filtered = allProviders;
    if (filterType === 'Active') filtered = allProviders.filter(p => ['A','B','C','F'].includes(p.plan));
    else if (filterType === 'Pending') filtered = allProviders.filter(p => p.plan === 'Pending');
    else if (filterType === 'Failed') filtered = allProviders.filter(p => p.plan === 'Fail');

    const tbody = document.getElementById('adm-providers-table');
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">No ${filterType.toLowerCase()} providers found.</td></tr>`; return; }

    tbody.innerHTML = filtered.map(p => {
        return `<tr>
            <td><b>${p.name || 'Unknown'}</b></td>
            <td>${p.phone || 'N/A'}</td>
            <td>
                <select class="plan-select" onchange="updatePlan('${p.phone}', this.value)">
                    <option value="A" ${p.plan === 'A' ? 'selected' : ''}>Weekly (A)</option>
                    <option value="B" ${p.plan === 'B' ? 'selected' : ''}>Monthly (B)</option>
                    <option value="C" ${p.plan === 'C' ? 'selected' : ''}>Yearly (C)</option>
                    <option value="F" ${p.plan === 'F' ? 'selected' : ''}>Free (F)</option>
                    <option value="Pending" ${p.plan === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Fail" ${p.plan === 'Fail' ? 'selected' : ''}>Fail</option>
                </select>
            </td>
            <td>${p.daysLeft > 0 ? `<b>${p.daysLeft}</b> days` : 'Expired'}</td>
            <td>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Total: ${p.totalOrders || 0}</span> | 
                <span style="font-size: 0.75rem; color: #10b981; font-weight:700;">Acc: ${p.acceptedOrders || 0}</span> | 
                <span style="font-size: 0.75rem; color: #ef4444; font-weight:700;">Dec: ${p.declinedOrders || 0}</span>
            </td>
        </tr>`;
    }).join('');
}

// --- RENDER TAKERS ---
function renderTakers() {
    const tbody = document.getElementById('adm-takers-table');
    if (allTakers.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">No takers registered.</td></tr>`; return; }

    tbody.innerHTML = allTakers.map(t => {
        return `<tr>
            <td><b>${t.name || 'Unknown'}</b></td>
            <td>${t.phone || 'N/A'}</td>
            <td>${t.location || 'N/A'}</td>
            <td>${t.totalOrders || 0}</td>
            <td style="color: #10b981; font-weight: 700;">${t.acceptedOrders || 0}</td>
            <td style="color: #ef4444; font-weight: 700;">${t.declinedOrders || 0}</td>
        </tr>`;
    }).join('');
}

// --- RENDER REVENUE ---
function renderRevenue() {
    const tbody = document.getElementById('adm-revenue-table');
    if (allRevenue.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;">No revenue payments recorded yet.</td></tr>`; return; }

    tbody.innerHTML = allRevenue.map(r => `
        <tr>
            <td class="font-mono">${r.phone || 'N/A'}</td>
            <td><b>Code ${r.plan || 'N/A'}</b></td>
            <td style="color: var(--brand); font-weight: 700;">${r.amount || 0} ETB</td>
            <td>${r.paymentMethod || 'N/A'}</td>
            <td>${r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// --- RENDER FEEDBACKS ---
function renderFeedbacks() {
    const tbody = document.getElementById('adm-feedback-table');
    if (allFeedbacks.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem;">No feedbacks received yet.</td></tr>`; return; }

    tbody.innerHTML = allFeedbacks.map(f => `
        <tr>
            <td><b>${f.name || 'Anonymous'}</b></td>
            <td>${f.email || 'N/A'}</td>
            <td>${f.message || 'N/A'}</td>
            <td>${f.date ? new Date(f.date).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// --- RENDER NOTIFICATIONS ---
function renderNotifications() {
    const tbody = document.getElementById('adm-notifications-table');
    if (!tbody) return;
    if (allNotifications.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem;">No notifications found.</td></tr>`; return; }

    tbody.innerHTML = allNotifications.map(n => `
        <tr>
            <td class="font-mono">${n.phone || 'All'}</td>
            <td><b>${n.title || 'Notification'}</b></td>
            <td>${n.message || ''}</td>
            <td>${n.timestamp ? new Date(n.timestamp).toLocaleString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// --- UPDATE PLAN DIRECTLY ---
async function updatePlan(phone, newPlan) { 
    if(!confirm(`Are you sure you want to change this provider's plan to ${newPlan}?`)) return;
    const res = await apiCall('updatePlan', { phone: phone, plan: newPlan, role: 'provider' }); 
    if(res.status === 'success') { 
        alert(`Plan updated to ${newPlan}!`); 
        window.location.reload(); 
    } else {
        alert('Failed to update plan.');
    }
}

// --- APPROVE/REJECT PAYMENT ---
async function approvePayment(txnId, phone, plan) { 
    if(!confirm(`Are you sure you want to mark this payment as ${plan}?`)) return;
    
    document.getElementById('modal-approve-btn').disabled = true;
    document.getElementById('modal-fail-btn').disabled = true;

    const res = await apiCall('approvePayment', { txnId, phone, plan, role: 'provider' }); 
    if(res.status === 'success') { 
        alert(`Payment updated successfully!`); 
        window.location.reload(); 
    } else {
        alert('Failed to process payment approval.');
        document.getElementById('modal-approve-btn').disabled = false;
        document.getElementById('modal-fail-btn').disabled = false;
    }
}