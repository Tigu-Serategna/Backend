const API_URL = 'https://script.google.com/macros/s/AKfycbwQYRCWa4FgSI3GvrDAFszdboabHUxsEucPnT0YBMzYb39eMqmCjatiQvymV_A_uPlH/exec';
if(localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');
const planCode = localStorage.getItem('selectedPlanCode') || 'B';
const planPrice = localStorage.getItem('selectedPlanPrice') || '149';
if(planCode === 'F') window.location.href = 'verify.html?free=true';
document.getElementById('plan-name').innerText = planCode === 'A' ? 'Starter Weekly' : (planCode === 'B' ? 'Professional Monthly' : 'Enterprise Yearly');
document.getElementById('plan-price').innerText = planPrice + ' ETB';
let selectedMethodName = 'Telebirr';
const methods = {
    telebirr: {
        num: '0957808805',
        qr: '0957808805',
        name: 'Telebirr'
    },
    cbebirr: {
        num: '1000734778897',
        qr: '1000734778897',
        name: 'CBE Birr'
    },
    bank: {
        num: '1000734778897',
        qr: '1000734778897',
        name: 'Bank Transfer'
    }
};

function setMethod(m) {
    document.querySelectorAll('.methods .btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${m}`).classList.add('active');
    document.getElementById('account-number').innerText = methods[m].num;
    document.getElementById('qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${methods[m].qr}`;
    selectedMethodName = methods[m].name;
}

function copyAcc() {
    navigator.clipboard.writeText(document.getElementById('account-number').innerText).then(() => {
        alert('Account number copied!');
    });
}

function getUser() {
    return JSON.parse(localStorage.getItem('tiguseratega_user') || 'null');
}
// JSON API CALL (Fixes long text issue)
async function apiCall(action, data = {}) {
    data.action = action;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            }, // Send as plain text/JSON
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch(err) {
        console.error(err);
        return {
            status: 'error',
            message: 'Network error: ' + err.toString()
        };
    }
}
async function processScreenshot(e) {
    if(!e.target.files.length) return;
    const file = e.target.files[0];
    const ocrResult = document.getElementById('ocr-result');
    const textarea = document.getElementById('extractedText');
    const submitBtn = document.getElementById('submitBtn');
    const overlay = document.getElementById('scan-overlay');
    const progressText = document.getElementById('scan-progress-text');
    overlay.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 16px; margin-right: 8px;"></i> Scanning Image...';
    lucide.createIcons();
    try {
        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if(m.status === 'recognizing text') {
                    progressText.innerText = `Scanning Receipt... ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        const ret = await worker.recognize(file);
        const extractedText = ret.data.text.trim();
        textarea.value = extractedText || "No readable text found.";
        overlay.style.display = 'none';
        ocrResult.classList.remove('hidden');
        if(extractedText.length > 5) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.innerHTML = '<i data-lucide="check-circle" style="width: 16px; margin-right: 8px;"></i> Verify & Submit';
        } else {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'No text found. Retry.';
        }
        await worker.terminate();
    } catch(error) {
        console.error(error);
        overlay.style.display = 'none';
        alert('Failed to scan image. Please try again.');
        submitBtn.innerHTML = 'Scan Failed. Try Again.';
    }
    lucide.createIcons();
}
async function submitPayment() {
    const user = getUser();
    if(!user) {
        alert('Session expired. Please log in again.');
        window.location.href = 'login.html';
        return;
    }
    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 16px; margin-right: 8px;"></i> Submitting...';
    btn.disabled = true;
    lucide.createIcons();
    // Send JSON payload
    const res = await apiCall('submitPaymentProof', {
        txnId: 'TXN' + Math.floor(100000 + Math.random() * 900000),
        phone: user.phone,
        amount: planPrice,
        plan: planCode,
        role: user.role || 'provider',
        extractedText: document.getElementById('extractedText').value,
        method: selectedMethodName
    });
    if(res.status === 'success') {
        window.location.href = 'verify.html';
    } else {
        // Show EXACT error message from backend
        alert('Failed to submit: ' + (res.message || 'Unknown error occurred. Please check your API URL.'));
        btn.innerHTML = 'Verify & Submit';
        btn.disabled = false;
        lucide.createIcons();
    }
}
lucide.createIcons();