const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
if(localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');
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

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'glass-panel';
    t.style.cssText = 'padding: 1rem 1.5rem; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-main);';
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function setUser(u) {
    localStorage.setItem('tiguseratega_user', JSON.stringify(u));
}
let loginRole = 'taker';

function setLoginRole(role) {
    loginRole = role;
    document.getElementById('loginRole').value = role;
    const t = document.getElementById('login-taker'),
        p = document.getElementById('login-provider');
    const passGroup = document.getElementById('login-password-group'),
        passInput = document.getElementById('loginPassword');
    if(role === 'taker') {
        t.classList.add('active');
        p.classList.remove('active');
        passGroup.classList.add('hidden');
        passInput.required = false;
    } else {
        p.classList.add('active');
        t.classList.remove('active');
        passGroup.classList.remove('hidden');
        passInput.required = true;
    }
}

function showErrorPopup() {
    document.getElementById('error-popup').classList.remove('hidden');
}

function closeErrorPopup() {
    document.getElementById('error-popup').classList.add('hidden');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
}
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="display:inline-block; vertical-align:middle; width:16px; margin-right:4px;"></i> Signing in...';
    lucide.createIcons();
    const data = {
        phone: document.getElementById('loginPhone').value,
        role: loginRole
    };
    if(loginRole === 'provider') data.password = document.getElementById('loginPassword').value;
    const res = await apiCall('login', data);
    if(res.status === 'success') {
        setUser(res.user);
        showToast('Signed in successfully!');
        if(loginRole === 'taker') {
            window.location.href = 'dashboard-taker.html';
        } else {
            if(res.user.plan === 'Pending' || res.user.plan === 'Fail') {
                window.location.href = 'verify.html';
            } else {
                window.location.href = 'dashboard-provider.html';
            }
        }
    } else {
        btn.disabled = false;
        btn.innerHTML = original;
        lucide.createIcons();
        if(res.message === 'Incorrect password') {
            showErrorPopup();
        } else {
            showToast(res.message || 'User not found');
        }
    }
}
lucide.createIcons();