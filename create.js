const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
const CITIES = ["Addis Ababa", "Adama (Nazret)", "Gondar", "Mekelle", "Hawassa", "Bahir Dar", "Dire Dawa", "Jimma", "Jijiga", "Shashamane", "Bishoftu (Debre Zeit)", "Arba Minch", "Harar", "Dessie", "Sodo", "Nekemte", "Asosa", "Gambela", "Semera", "Axum", "Lalibela", "Debre Markos", "Debre Birhan", "Wolkite", "Hosaena", "Assela", "Dilla", "Ambo", "Gode", "Kombolcha", "Mizan Teferi", "Asaita", "Yirga Alem"];
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

function getUserIP() {
    return fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => 'Unknown');
}
let currentRole = 'taker';

function setRole(role) {
    currentRole = role;
    document.getElementById('role').value = role;
    const t = document.getElementById('btn-taker'),
        p = document.getElementById('btn-provider'),
        f = document.getElementById('provider-fields');
    const passInput = document.getElementById('password');
    if(role === 'taker') {
        t.classList.add('active');
        p.classList.remove('active');
        f.classList.add('hidden');
        passInput.required = false;
        document.getElementById('services-hidden').required = false;
    } else {
        p.classList.add('active');
        t.classList.remove('active');
        f.classList.remove('hidden');
        passInput.required = true;
        document.getElementById('services-hidden').required = true;
    }
}

function filterCities() {
    const input = document.getElementById('location').value.toLowerCase(),
        list = document.getElementById('city-list');
    list.innerHTML = '';
    if(input.length === 0) {
        list.classList.add('hidden');
        return;
    }
    const filtered = CITIES.filter(c => c.toLowerCase().startsWith(input));
    if(filtered.length > 0) {
        list.classList.remove('hidden');
        filtered.forEach(city => {
            const li = document.createElement('li');
            li.innerText = city;
            li.onclick = () => {
                document.getElementById('location').value = city;
                list.classList.add('hidden');
            };
            list.appendChild(li);
        });
    } else {
        list.classList.add('hidden');
    }
}
document.addEventListener('click', (e) => {
    if(!e.target.closest('.relative')) document.getElementById('city-list').classList.add('hidden');
});
let tags = [];
const tagInput = document.getElementById('tag-input');
const tagContainer = document.getElementById('tag-container');
const hiddenInput = document.getElementById('services-hidden');
tagInput.addEventListener('keydown', function(e) {
    if(e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        const val = this.value.trim().replace(/,/g, '');
        if(val && !tags.includes(val)) {
            tags.push(val);
            renderTags();
            this.value = '';
        }
    }
    if(e.key === 'Backspace' && this.value === '' && tags.length > 0) {
        tags.pop();
        renderTags();
    }
});

function renderTags() {
    Array.from(tagContainer.querySelectorAll('.tag')).forEach(el => el.remove());
    tags.forEach(tagText => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `${tagText} <span class="tag-close" onclick="removeTag('${tagText}')"><i data-lucide="x"></i></span>`;
        tagContainer.insertBefore(tagEl, tagInput);
    });
    lucide.createIcons();
    hiddenInput.value = tags.join(',');
}

function removeTag(tagText) {
    tags = tags.filter(t => t !== tagText);
    renderTags();
}
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = 'Processing...';
    const ip = await getUserIP();
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const data = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        gender: gender,
        role: currentRole,
        ip: ip
    };
    let action = currentRole === 'provider' ? 'registerProvider' : 'registerTaker';
    if(currentRole === 'provider') {
        data.services = document.getElementById('services-hidden').value;
        data.password = document.getElementById('password').value;
        data.bio = document.getElementById('bio').value;
    }
    const res = await apiCall(action, data);
    if(res.status === 'success') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: {
                y: 0.6
            }
        });
        setUser(res.data);
        showToast('Account created!');
        setTimeout(() => {
            window.location.href = currentRole === 'taker' ? 'dashboard-taker.html' : 'plan.html';
        }, 1500);
    } else {
        showToast('Failed to register.');
        btn.disabled = false;
        btn.innerText = 'Create Account';
    }
}
if(new URLSearchParams(window.location.search).get('role') === 'provider') setRole('provider');
lucide.createIcons();