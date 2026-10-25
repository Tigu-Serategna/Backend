const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec'; 
if (localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');
function toggleTheme() { const h = document.documentElement; h.classList.toggle('dark'); localStorage.setItem('tiguseratega_theme', h.classList.contains('dark') ? 'dark' : 'light'); updateThemeIcon(); }
function updateThemeIcon() { const isDark = document.documentElement.classList.contains('dark'); document.getElementById('theme-toggle').innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>'; lucide.createIcons(); }
function getUser() { return JSON.parse(localStorage.getItem('tiguseratega_user') || 'null'); }
function setUser(u) { localStorage.setItem('tiguseratega_user', JSON.stringify(u)); }
function logout() { localStorage.removeItem('tiguseratega_user'); localStorage.removeItem('tiguseratega_user_image'); window.location.href = 'index.html'; }
async function apiCall(action, data = {}) { const formData = new URLSearchParams(); formData.append('action', action); for (const key in data) if (data[key] !== undefined && data[key] !== null) formData.append(key, data[key]); try { const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData.toString() }); return await res.json(); } catch { return { status: 'error' }; } }
function showToast(m) { alert(m); }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }

function timeAgo(dateString) {
    if(!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const secondsPast = (now.getTime() - date.getTime()) / 1000;
    if (secondsPast < 60) return parseInt(secondsPast) + 's ago';
    if (secondsPast < 3600) return parseInt(secondsPast / 60) + 'm ago';
    if (secondsPast <= 86400) return parseInt(secondsPast / 3600) + 'h ago';
    const days = parseInt(secondsPast / 86400);
    return days === 1 ? "1 day ago" : days + " days ago";
}

let user = getUser(), providers = [], jobs = [], orders = [], myProposals = [], activeChatOrderId = null;
const defaultMaleAvatar = 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png';
const defaultFemaleAvatar = 'https://cdn-icons-png.flaticon.com/512/4333/4333613.png';

document.addEventListener('DOMContentLoaded', async () => {
    updateThemeIcon();
    if (!user) { window.location.href = 'login.html'; return; }
    
    document.getElementById('nav-name').innerText = user.name.split(' ')[0];
    document.getElementById('header-name').innerText = user.name.split(' ')[0];
    document.getElementById('side-name').innerText = user.name;
    document.getElementById('avatar-initials').innerText = user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    
    const defaultAvatar = user.gender === 'Female' ? defaultFemaleAvatar : defaultMaleAvatar;
    const localImage = localStorage.getItem('tiguseratega_user_image');
    
    if (localImage) document.getElementById('nav-avatar').src = localImage;
    else if (user.image) document.getElementById('nav-avatar').src = user.image;
    else document.getElementById('nav-avatar').src = defaultAvatar;

    const p = await apiCall('getProviders'); if (p.status === 'success') { providers = p.data; renderProviders(); }
    const j = await apiCall('getJobs'); if (j.status === 'success') { jobs = j.data.filter(x => x.vacancies > 0); renderJobs(); }
    const o = await apiCall('getTakerOrders', { phone: user.phone }); if (o.status === 'success') { orders = o.data; renderOrders(); renderChats(); }
    
    const prop = await apiCall('getTakerProposals', { phone: user.phone }); 
    if(prop.status === 'success') myProposals = prop.data;

    calculateStats();
    loadNotifications();
});

function calculateStats() {
    document.getElementById('stat-total-orders').innerText = orders.length;
    document.getElementById('stat-accepted-orders').innerText = orders.filter(o => o.status === 'accepted').length;
    document.getElementById('stat-declined-orders').innerText = orders.filter(o => o.status === 'declined').length;
    document.getElementById('stat-total-jobs').innerText = myProposals.length;
}

function switchTab(id) { 
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); 
    document.querySelector(`.nav-item[onclick="switchTab('${id}')"]`).classList.add('active'); 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
    document.getElementById(`content-${id}`).classList.add('active'); 
    if (id === 'notifications') {
        document.getElementById('nav-notif-dot').classList.add('hidden');
        document.getElementById('nav-notif-count').classList.add('hidden');
        document.getElementById('side-notif-count').classList.add('hidden');
    }
}

function renderProviders() {
    const search = document.getElementById('provider-search').value.toLowerCase();
    let filtered = providers.filter(p => p.name.toLowerCase().includes(search) || (p.services && p.services.toLowerCase().includes(search)));
    filtered.sort((a, b) => (b.location === user.location ? 1 : 0) - (a.location === user.location ? 1 : 0));

    document.getElementById('provider-grid').innerHTML = filtered.map(p => {
        const defaultP = p.gender === 'Female' ? defaultFemaleAvatar : defaultMaleAvatar;
        const pImg = p.image || defaultP;
        return `
        <div class="provider-card">
            <div class="provider-header">
                <img src="${pImg}" class="provider-avatar">
                <div class="provider-info"><h3>${p.name}</h3><p class="role">${p.services ? p.services.split(',')[0] : 'Professional'}</p></div>
            </div>
            <p class="provider-bio">${p.bio || 'Verified professional ready to help.'}</p>
            <div class="provider-tags">${(p.services || 'General').split(',').map(s => `<span class="tag">${s.trim()}</span>`).join('')}</div>
            <div class="provider-meta"><span><i data-lucide="map-pin" style="width: 12px;"></i> ${p.location || 'Addis Ababa'}</span><span><i data-lucide="star" style="width: 12px;"></i> ${(parseFloat(p.rating)||5.0).toFixed(1)}</span></div>
            <div class="provider-actions"><button onclick="openRequestModal('${p.name}', '${p.phone}', '${p.services}')" class="btn-primary">Request service →</button></div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function openRequestModal(name, phone, servicesStr) {
    document.getElementById('req-provider-name').value = name;
    document.getElementById('req-provider-phone').value = phone;
    document.getElementById('req-title').innerText = `Request ${name}`;
    const select = document.getElementById('req-service'); select.innerHTML = '';
    const services = (servicesStr || 'General').split(',');
    services.forEach(s => { const opt = document.createElement('option'); opt.value = s.trim(); opt.innerText = s.trim(); select.appendChild(opt); });
    openModal('request-modal');
}

async function submitRequest(e) {
    e.preventDefault();
    const data = { id: 'ORD-' + Math.floor(Math.random() * 10000), providerName: document.getElementById('req-provider-name').value, providerPhone: document.getElementById('req-provider-phone').value, takerName: user.name, takerPhone: user.phone, service: document.getElementById('req-service').value, location: document.getElementById('req-location').value, price: document.getElementById('req-price').value, status: 'pending', date: new Date().toISOString().split('T')[0] };
    const res = await apiCall('hireProvider', data);
    if (res.status === 'success') { closeModal('request-modal'); showToast('Request sent!'); setTimeout(()=>window.location.reload(), 1000); } 
}

function renderOrders() { 
    document.getElementById('orders-list').innerHTML = orders.map(o => `
        <div class="list-card">
            <div><h4 style="margin-bottom: 0.25rem;">${o.providerName}</h4><p style="font-size: 0.85rem; color: var(--text-muted);">${o.service} · ${o.date}</p></div>
            <div style="text-align: right;"><p style="font-weight: 800; margin-bottom: 0.5rem;">${o.price} ETB</p><span class="tag" style="background: ${o.status === 'accepted' ? '#dcfce7' : '#fef3c7'}; color: ${o.status === 'accepted' ? '#166534' : '#b45309'};">${o.status.toUpperCase()}</span></div>
        </div>`).join(''); 
}

function renderJobs() { 
    document.getElementById('jobs-list').innerHTML = jobs.map(j => `
        <div class="list-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><h4>${j.title}</h4><span style="font-weight: 800; color: var(--primary);">${parseInt(j.budget).toLocaleString()} ETB</span></div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${j.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1rem;">
                <span style="font-size: 0.75rem; color: var(--text-muted);"><i data-lucide="clock" style="width: 12px;"></i> ${timeAgo(j.postedAt)}</span>
                <button onclick="openApplyModal('${j.employerPhone}', '${j.title}', '${j.id}')" class="btn-outline" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Apply Now</button>
            </div>
        </div>`).join(''); 
    lucide.createIcons();
}

// FIX: Made apply free
function openApplyModal(employerPhone, title, jobId) {
    document.getElementById('apply-job-id').value = jobId; 
    document.getElementById('apply-employer-phone').value = employerPhone; 
    document.getElementById('apply-job-title').innerText = title; 
    openModal('apply-modal'); 
}

function openModal(id) { document.getElementById(id).classList.add('show'); } 
function closeModal(id) { document.getElementById(id).classList.remove('show'); if(id==='chat-modal'){ clearInterval(window.chatInterval); activeChatOrderId=null; } }

// FIX: Edit profile modal logic
function openEditModal() { 
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-location').value = user.location || '';
    const localImage = localStorage.getItem('tiguseratega_user_image');
    const defaultAvatar = user.gender === 'Female' ? defaultFemaleAvatar : defaultMaleAvatar;
    document.getElementById('edit-img-preview').src = localImage || user.image || defaultAvatar;
    openModal('edit-modal'); 
}

function previewImage(e) { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = function(event) { document.getElementById('edit-img-preview').src = event.target.result; }; reader.readAsDataURL(file); } }

async function saveProfile(e) {
    e.preventDefault(); 
    const btn = document.getElementById('save-profile-btn'); btn.disabled = true; btn.innerText = 'Saving...';
    const fileInput = document.getElementById('edit-img-file'); 
    let imageUrl = user.image || '';
    
    if(fileInput.files.length > 0) { 
        const base64 = await fileToBase64(fileInput.files[0]); 
        localStorage.setItem('tiguseratega_user_image', base64);
        document.getElementById('nav-avatar').src = base64;
    }
    
    const newName = document.getElementById('edit-name').value || user.name; 
    const newPhone = document.getElementById('edit-phone').value || user.phone; 
    const newLoc = document.getElementById('edit-location').value;
    
    const res = await apiCall('updateProfile', { oldPhone: user.phone, role: 'taker', newName, newPhone, location: newLoc, image: imageUrl });
    if(res.status === 'success') { 
        user.name = newName; user.phone = newPhone; user.location = newLoc; setUser(user); 
        document.getElementById('nav-name').innerText = newName.split(' ')[0];
        document.getElementById('header-name').innerText = newName.split(' ')[0]; 
        document.getElementById('side-name').innerText = newName; 
        closeModal('edit-modal'); showToast('Profile updated!'); 
    }
    btn.disabled = false; btn.innerText = 'Save Changes';
}

async function submitProposal(e) { 
    e.preventDefault(); 
    const data = { jobId: document.getElementById('apply-job-id').value, jobTitle: document.getElementById('apply-job-title').innerText, applicantName: user.name, applicantPhone: user.phone, employerPhone: document.getElementById('apply-employer-phone').value, expectedPay: document.getElementById('apply-pay').value, coverNote: document.getElementById('apply-note').value }; 
    const res = await apiCall('applyJob', data); 
    if (res.status === 'success') { closeModal('apply-modal'); showToast('Application sent!'); setTimeout(()=>window.location.reload(),1000); } 
}

function renderChats() {
    const acceptedOrders = orders.filter(o => o.status === 'accepted');
    document.getElementById('chats-list').innerHTML = acceptedOrders.length === 0 ? `<p class="text-muted">No active chats.</p>` : acceptedOrders.map(o => `
        <div class="list-card">
            <div><h4 style="margin-bottom: 0.25rem;">${o.providerName}</h4><p style="font-size: 0.75rem; color: var(--text-muted);">Order ID: ${o.id}</p></div>
            <button onclick="openChat('${o.id}', '${o.providerName}')" class="btn-primary" style="flex: 0;"><i data-lucide="message-circle" style="width: 16px;"></i> Chat</button>
        </div>`).join('');
    lucide.createIcons();
}

async function loadNotifications() {
    const res = await apiCall('getNotifications', { phone: user.phone });
    if(res.status === 'success' && res.data.length > 0) {
        document.getElementById('nav-notif-dot').classList.remove('hidden');
        document.getElementById('nav-notif-count').classList.remove('hidden');
        document.getElementById('nav-notif-count').innerText = res.data.length;
        document.getElementById('side-notif-count').classList.remove('hidden');
        document.getElementById('side-notif-count').innerText = res.data.length;
        document.getElementById('notifications-list').innerHTML = res.data.map(n => `<div class="list-card" style="border-left: 4px solid var(--primary);"><h4 style="font-size: 0.95rem;">${n.title}</h4><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">${n.message}</p></div>`).join('');
    } else { document.getElementById('notifications-list').innerHTML = `<p class="text-muted">No new notifications.</p>`; }
}

function openChat(orderId, targetName) { activeChatOrderId = orderId; document.getElementById('chat-title').innerText = targetName; document.getElementById('chat-order-id').innerText = orderId; document.getElementById('chat-box').innerHTML = ''; openModal('chat-modal'); fetchChatHistory(); window.chatInterval = setInterval(fetchChatHistory, 3000); }
async function fetchChatHistory() { if(!activeChatOrderId) return; const res = await apiCall('getChat', { orderId: activeChatOrderId }); if(res.status === 'success') { const box = document.getElementById('chat-box'); box.innerHTML = res.data.map(c => `<div class="chat-msg ${c.senderPhone === user.phone ? 'me' : 'them'}">${c.message}</div>`).join(''); box.scrollTop = box.scrollHeight; } }
async function sendChatMessage(e) { e.preventDefault(); const input = document.getElementById('chat-input'); const msg = input.value; if(!msg || !activeChatOrderId) return; input.value = ''; const box = document.getElementById('chat-box'); box.innerHTML += `<div class="chat-msg me">${msg}</div>`; box.scrollTop = box.scrollHeight; await apiCall('sendChat', { orderId: activeChatOrderId, senderPhone: user.phone, message: msg }); }