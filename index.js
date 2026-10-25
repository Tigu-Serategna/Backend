const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
if(localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');

function toggleTheme() {
    const h = document.documentElement;
    h.classList.toggle('dark');
    localStorage.setItem('tiguseratega_theme', h.classList.contains('dark') ? 'dark' : 'light');
    lucide.createIcons();
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

function showToast(msg, icon = 'check-circle') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'glass-panel';
    t.style.cssText = 'padding: 1rem 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); animation: slideUp 0.3s ease-out; border-radius: 0.5rem;';
    t.innerHTML = `<i data-lucide="${icon}" style="color: var(--primary);"></i> ${msg}`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => t.remove(), 3000);
}
async function submitFeedback(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = 'Sending...';
    const data = {
        name: document.getElementById('fb-name').value,
        email: document.getElementById('fb-email').value,
        message: document.getElementById('fb-message').value,
        date: new Date().toISOString()
    };
    const res = await apiCall('submitFeedback', data);
    if(res.status === 'success') {
        showToast('Feedback sent successfully!');
        e.target.reset();
    } else {
        showToast('Failed to send.', 'alert-circle');
    }
    btn.disabled = false;
    btn.innerText = 'Send Message';
}
lucide.createIcons();