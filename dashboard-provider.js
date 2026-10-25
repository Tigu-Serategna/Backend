const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
if(localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');

function toggleTheme() {
    const h = document.documentElement;
    h.classList.toggle('dark');
    localStorage.setItem('tiguseratega_theme', h.classList.contains('dark') ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-toggle').innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
}

function getUser() {
    return JSON.parse(localStorage.getItem('tiguseratega_user') || 'null');
}

function setUser(u) {
    localStorage.setItem('tiguseratega_user', JSON.stringify(u));
}

function logout() {
    localStorage.removeItem('tiguseratega_user');
    localStorage.removeItem('tiguseratega_user_image');
    window.location.href = 'index.html';
}
async function apiCall(action, data = {}) {
    const formData = new URLSearchParams();
    formData.append('action', action);
    for(const key in data)
        if(data[key] !== undefined && data[key] !== null) formData.append(key, data[key]);
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
        return await res.json();
    } catch {
        return {
            status: 'error'
        };
    }
}

function showToast(m) {
    alert(m);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function timeAgo(dateString) {
    if(!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const secondsPast = (now.getTime() - date.getTime()) / 1000;
    if(secondsPast < 60) return parseInt(secondsPast) + 's ago';
    if(secondsPast < 3600) return parseInt(secondsPast / 60) + 'm ago';
    if(secondsPast <= 86400) return parseInt(secondsPast / 3600) + 'h ago';
    const days = parseInt(secondsPast / 86400);
    return days === 1 ? "1 day ago" : days + " days ago";
}
let user = getUser(),
    incomingOrders = [],
    myJobs = [],
    allJobs = [],
    activeChatOrderId = null,
    currentFilter = 'all';
const defaultMaleAvatar = 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png';
const defaultFemaleAvatar = 'https://cdn-icons-png.flaticon.com/512/4333/4333613.png';
document.addEventListener('DOMContentLoaded', async() => {
    updateThemeIcon();
    if(!user) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('nav-name').innerText = user.name.split(' ')[0];
    document.getElementById('header-name').innerText = user.name.split(' ')[0];
    document.getElementById('side-name').innerText = user.name;
    document.getElementById('avatar-initials').innerText = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const defaultAvatar = user.gender === 'Female' ? defaultFemaleAvatar : defaultMaleAvatar;
    const localImage = localStorage.getItem('tiguseratega_user_image');
    if(localImage) document.getElementById('nav-avatar').src = localImage;
    else if(user.image) document.getElementById('nav-avatar').src = user.image;
    else document.getElementById('nav-avatar').src = defaultAvatar;
    const planMap = {
        'A': '[A] Weekly',
        'B': '[B] Monthly',
        'C': '[C] VIP',
        'F': '[F] Trial'
    };
    document.getElementById('plan-badge').innerText = planMap[user.plan] || '[F] Trial';
    const o = await apiCall('getProviderOrders', {
        phone: user.phone
    });
    if(o.status === 'success') {
        incomingOrders = o.data;
        renderProviderOrders();
    }
    const j = await apiCall('getJobs');
    if(j.status === 'success') {
        allJobs = j.data;
        renderAllJobs();
        myJobs = j.data.filter(x => x.employerPhone === user.phone);
        renderMyJobs();
    }
    calculateProviderStats();
    renderChats();
    loadNotifications();
});

function calculateProviderStats() {
    document.getElementById('p-stat-orders').innerText = incomingOrders.length;
    document.getElementById('p-stat-accepted').innerText = incomingOrders.filter(o => o.status === 'accepted').length;
    document.getElementById('p-stat-declined').innerText = incomingOrders.filter(o => o.status === 'declined').length;
    document.getElementById('p-stat-created').innerText = myJobs.length;
}

function switchTab(id) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="switchTab('${id}')"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`content-${id}`).classList.add('active');
    if(id === 'notifications') {
        document.getElementById('nav-notif-dot').classList.add('hidden');
        document.getElementById('nav-notif-count').classList.add('hidden');
        document.getElementById('side-notif-count').classList.add('hidden');
    }
}

function filterOrders(status, btn) {
    currentFilter = status;
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProviderOrders();
}

function renderProviderOrders() {
    const filtered = incomingOrders.filter(o => currentFilter === 'all' || o.status === currentFilter);
    document.getElementById('provider-orders-list').innerHTML = filtered.map(o => `
        <div class="list-card">
            <div><p style="font-weight: 700;">${o.takerName}</p><p style="font-size: 0.8rem; color: var(--text-muted);">${o.service} · ${o.location || 'Location'}</p></div>
            <div style="display: flex; gap: 0.5rem;">
                ${o.status === 'pending' ? ` < button onclick = "updateOrder('${o.id}', 'accepted')"
        class = "btn-primary"
        style = "padding: 0.4rem 0.8rem; font-size: 0.75rem; flex: 0;" > Accept < /button><button onclick="updateOrder('${o.id}', 'declined')" class="btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; color: #ef4444; border-color: #ef4444;">Decline</button > ` : o.status === 'accepted' ? ` < button onclick = "openChat('${o.id}', '${o.takerName}')"
        class = "btn-primary"
        style = "padding: 0.4rem 0.8rem; font-size: 0.75rem; flex: 0;" > < i data - lucide = "message-circle" > < /i> Chat</button > ` : ''}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}
async function updateOrder(id, status) {
    const res = await apiCall('updateOrderStatus', {
        id, status
    });
    if(res.status === 'success') {
        showToast(`Order ${status}!`);
        setTimeout(() => window.location.reload(), 1000);
    }
}

function renderMyJobs() {
    document.getElementById('my-jobs-list').innerHTML = myJobs.map(j => `
        <div class="list-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><h4>${j.title}</h4><span class="tag">${j.vacancies} vacancies</span></div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${j.description}</p>
            <button onclick="viewProposals('${j.id}', '${j.title}')" class="btn-outline" style="width: 100%;">View Proposals</button>
        </div>
    `).join('');
}
// Amazing Flex Layout for Jobs
function renderAllJobs() {
    const openJobs = allJobs.filter(j => j.employerPhone !== user.phone && parseInt(j.vacancies) > 0);
    document.getElementById('all-jobs-list').innerHTML = openJobs.map(j => `
        <div class="provider-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <h4>${j.title}</h4>
                <span style="font-weight: 800; color: var(--primary);">${parseInt(j.budget).toLocaleString()} ETB</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${j.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1rem; margin-top: auto;">
                <span style="font-size: 0.75rem; color: var(--text-muted);"><i data-lucide="clock" style="width: 12px;"></i> ${timeAgo(j.postedAt)}</span>
                <button onclick="applyForJob('${j.id}', '${j.title}', '${j.employerPhone}')" class="btn-primary" style="width: auto;">Apply Now</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}
// FIX: Free Apply
async function applyForJob(jobId, title, employerPhone) {
    const res = await apiCall('applyJob', {
        jobId, jobTitle: title, applicantName: user.name, applicantPhone: user.phone, employerPhone, expectedPay: 2500, coverNote: 'I am interested in this job.'
    });
    if(res.status === 'success') {
        showToast('Applied successfully! It is free.');
    }
}
async function viewProposals(jobId, jobTitle) {
    document.getElementById('prop-job-title').innerText = `Proposals for ${jobTitle}`;
    const propRes = await apiCall('getProposals', {
        phone: user.phone
    });
    if(propRes.status === 'success') {
        const jobProps = propRes.data.filter(p => p.jobId === jobId);
        document.getElementById('job-proposals-list').innerHTML = jobProps.map(p => `
            <div class="list-card">
                <div><p style="font-weight: 700;">${p.applicantName}</p><p style="font-size: 0.8rem; color: var(--text-muted);">${p.coverNote}</p><p style="font-size: 0.8rem; font-weight: 800; color: var(--primary);">Expected: ${p.expectedPay} ETB</p></div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${p.status === 'Pending' ? ` < button onclick = "updateProposal('${p.id}', 'Accepted')"
            class = "btn-primary"
            style = "padding: 0.4rem 0.8rem; font-size: 0.75rem; flex: 0;" > Approve < /button><button onclick="updateProposal('${p.id}', 'Declined')" class="btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; color: #ef4444; border-color: #ef4444;">Decline</button > ` : ` < span class = "tag" > $ {
                p.status
            } < /span>`} < /div> < /div>
            `).join('');
        openModal('proposals-modal');
    }
}

async function updateProposal(propId, status) { 
    const res = await apiCall('updateProposalStatus', { propId, status, providerName: user.name }); 
    if (res.status === 'success') { showToast(`
            Proposal $ {
                status
            }!`); setTimeout(()=>window.location.reload(), 1000); } 
}

// FIX: Added loading spinner and popup
async function createJob(e) { 
    e.preventDefault(); 
    const btn = document.getElementById('publish-btn');
    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width:18px; height:18px;"></i> Publishing...';
    btn.disabled = true;
    lucide.createIcons();

    const data = { id: 'JOB-' + Math.floor(Math.random() * 10000), title: document.getElementById('job-title').value, employer: user.name, employerPhone: user.phone, city: document.getElementById('job-city').value, budget: document.getElementById('job-budget').value, vacancies: document.getElementById('job-vacancies').value, description: document.getElementById('job-desc').value, postedAt: new Date().toISOString() }; 
    const res = await apiCall('createJob', data); 
    
    if (res.status === 'success') { 
        alert('Job Published Successfully!');
        e.target.reset(); 
        setTimeout(()=>window.location.reload(),1000); 
    } else {
        alert('Failed to publish job.');
        btn.innerHTML = 'Publish Job';
        btn.disabled = false;
    }
}

function openModal(id) { document.getElementById(id).classList.add('show'); } 
function closeModal(id) { document.getElementById(id).classList.remove('show'); if(id==='chat-modal'){ clearInterval(window.chatInterval); activeChatOrderId=null; } }

function openEditModal() { 
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-services').value = user.services || '';
    document.getElementById('edit-location').value = user.location || '';
    document.getElementById('edit-bio').value = user.bio || '';
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
    const newServices = document.getElementById('edit-services').value;
    const newLoc = document.getElementById('edit-location').value;
    const newBio = document.getElementById('edit-bio').value;
    
    const res = await apiCall('updateProfile', { oldPhone: user.phone, role: 'provider', newName, newPhone, service: newServices, location: newLoc, bio: newBio, image: imageUrl });
    if(res.status === 'success') { 
        user.name = newName; user.phone = newPhone; user.services = newServices; user.location = newLoc; user.bio = newBio; setUser(user); 
        document.getElementById('nav-name').innerText = newName.split(' ')[0];
        document.getElementById('header-name').innerText = newName.split(' ')[0]; 
        document.getElementById('side-name').innerText = newName; 
        closeModal('edit-modal'); showToast('Profile updated!'); 
    }
    btn.disabled = false; btn.innerText = 'Save Changes';
}

function renderChats() {
    const acceptedOrders = incomingOrders.filter(o => o.status === 'accepted');
    document.getElementById('chats-list').innerHTML = acceptedOrders.length === 0 ? ` < p class = "text-muted" > No active chats. < /p>` : acceptedOrders.map(o => ` < div class = "list-card" > < div > < h4 style = "margin-bottom: 0.25rem;" > $ {
                o.takerName
            } < /h4><p style="font-size: 0.75rem; color: var(--text-muted);">Order ID: ${o.id}</p > < /div> < button onclick = "openChat('${o.id}', '${o.takerName}')"
            class = "btn-primary"
            style = "flex: 0;" > < i data - lucide = "message-circle"
            style = "width: 16px;" > < /i> Chat</button > < /div>`).join('');
            lucide.createIcons();
        }
        async function loadNotifications() {
            const res = await apiCall('getNotifications', {
                phone: user.phone
            });
            if(res.status === 'success' && res.data.length > 0) {
                document.getElementById('nav-notif-dot').classList.remove('hidden');
                document.getElementById('nav-notif-count').classList.remove('hidden');
                document.getElementById('nav-notif-count').innerText = res.data.length;
                document.getElementById('side-notif-count').classList.remove('hidden');
                document.getElementById('side-notif-count').innerText = res.data.length;
                document.getElementById('notifications-list').innerHTML = res.data.map(n => `<div class="list-card" style="border-left: 4px solid var(--primary);"><h4 style="font-size: 0.95rem;">${n.title}</h4><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">${n.message}</p></div>`).join('');
            } else {
                document.getElementById('notifications-list').innerHTML = `<p class="text-muted">No new notifications.</p>`;
            }
        }

        function openChat(orderId, targetName) {
            activeChatOrderId = orderId;
            document.getElementById('chat-title').innerText = targetName;
            document.getElementById('chat-order-id').innerText = orderId;
            document.getElementById('chat-box').innerHTML = '';
            openModal('chat-modal');
            fetchChatHistory();
            window.chatInterval = setInterval(fetchChatHistory, 3000);
        }
        async function fetchChatHistory() {
            if(!activeChatOrderId) return;
            const res = await apiCall('getChat', {
                orderId: activeChatOrderId
            });
            if(res.status === 'success') {
                const box = document.getElementById('chat-box');
                box.innerHTML = res.data.map(c => `<div class="chat-msg ${c.senderPhone === user.phone ? 'me' : 'them'}">${c.message}</div>`).join('');
                box.scrollTop = box.scrollHeight;
            }
        }
        async function sendChatMessage(e) {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const msg = input.value;
            if(!msg || !activeChatOrderId) return;
            input.value = '';
            const box = document.getElementById('chat-box');
            box.innerHTML += `<div class="chat-msg me">${msg}</div>`;
            box.scrollTop = box.scrollHeight;
            await apiCall('sendChat', {
                orderId: activeChatOrderId,
                senderPhone: user.phone,
                message: msg
            });
        }