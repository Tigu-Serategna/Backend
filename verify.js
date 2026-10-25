const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
if(localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');

function getUser() {
    return JSON.parse(localStorage.getItem('tiguseratega_user') || 'null');
}

function setUser(u) {
    localStorage.setItem('tiguseratega_user', JSON.stringify(u));
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
const user = getUser();
if(!user) window.location.href = 'login.html';
let isRedirecting = false;
if(new URLSearchParams(window.location.search).get('free') === 'true') {
    apiCall('submitPaymentProof', {
        txnId: 'FREE',
        phone: user.phone,
        amount: '0',
        plan: 'F',
        role: user.role,
        extractedText: 'Free Trial',
        method: 'None'
    }).then(() => {
        user.plan = 'F';
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        user.planExpiry = expiry.toISOString();
        setUser(user);
        document.getElementById('main-title').innerText = 'Trial Active!';
        document.getElementById('status-text').innerText = 'Redirecting...';
        document.getElementById('status-icon-container').style.background = '#ecfdf5';
        document.getElementById('status-icon').style.color = 'var(--primary)';
        document.getElementById('spinner').style.display = 'none';
        setTimeout(() => {
            window.location.href = user.role === 'provider' ? 'dashboard-provider.html' : 'dashboard-taker.html';
        }, 1500);
    });
} else {
    const poller = setInterval(async() => {
        const res = await apiCall('checkPaymentStatus', {
            phone: user.phone,
            role: user.role
        });
        if(res.status === 'success') {
            const plan = res.plan;
            if(['A', 'B', 'C', 'F'].includes(plan) && !isRedirecting) {
                isRedirecting = true;
                clearInterval(poller);
                user.plan = plan;
                user.planExpiry = res.planExpiry;
                setUser(user);
                document.getElementById('main-title').innerText = 'Account Approved!';
                document.getElementById('status-text').innerText = 'Redirecting...';
                document.getElementById('status-icon-container').style.background = '#ecfdf5';
                document.getElementById('status-icon').style.color = 'var(--primary)';
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('status-badge').innerText = 'Status: Active (' + plan + ')';
                document.getElementById('status-badge').style.background = '#dcfce7';
                document.getElementById('status-badge').style.color = '#166534';
                lucide.createIcons();
                setTimeout(() => {
                    window.location.href = user.role === 'provider' ? 'dashboard-provider.html' : 'dashboard-taker.html';
                }, 1500);
            } else if(plan === 'Fail') {
                document.getElementById('main-title').innerText = 'Payment Failed';
                document.getElementById('status-text').innerText = 'Rejected. Please try again.';
                document.getElementById('status-icon-container').style.background = '#fee2e2';
                document.getElementById('status-icon').style.color = '#ef4444';
                document.getElementById('status-icon').setAttribute('data-lucide', 'x-circle');
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('status-badge').innerText = 'Status: Failed';
                document.getElementById('status-badge').style.background = '#fee2e2';
                document.getElementById('status-badge').style.color = '#991b1b';
                lucide.createIcons();
            }
        }
    }, 1000);
}
lucide.createIcons();