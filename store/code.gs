const SPREADSHEET_ID = '1MOv9oefOXgXAu6TrKWbCCzcNh00kNdX4CV_2Pvjl6yA';
const DRIVE_FOLDER_ID = '1U0WJhYxpQQN82NIyM-GoIdW_mJIpqPOJ'; // <-- PASTE YOUR GOOGLE DRIVE FOLDER ID HERE

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  let response = { status: 'error', message: 'Invalid request' };
  try {
    const data = e.parameter; const action = data.action;
    if (!action) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
    delete data.action; const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    switch(action) {
      case 'registerTaker': response = registerUser(ss, 'service-taker-users', data); break;
      case 'registerProvider': response = registerUser(ss, 'Service-provider-users', data); break;
      case 'login': response = loginUser(ss, data); break;
      case 'getProviders': response = getSheetData(ss, 'Service-provider-users'); break;
      case 'getJobs': response = getSheetData(ss, 'jobs'); break;
      case 'getTakerOrders': response = getFilteredData(ss, 'user-orders', 'takerPhone', data.phone); break;
      case 'getProviderOrders': response = getFilteredData(ss, 'user-orders', 'providerPhone', data.phone); break;
      case 'createJob': response = appendData(ss, 'jobs', data); break;
      case 'hireProvider': response = appendData(ss, 'user-orders', data); break;
      case 'getProposals': response = getProposals(ss, data.phone); break;
      case 'applyJob': response = applyJob(ss, data); break;
      case 'updateProposalStatus': response = updateProposalStatus(ss, data); break;
      case 'updateOrderStatus': response = updateRowStatus(ss, 'user-orders', data.id, data.status); break;
      case 'updateProfile': response = updateProfile(ss, data); break;
      case 'submitPaymentProof': response = submitPaymentProof(ss, data); break;
      case 'checkPaymentStatus': response = checkPaymentStatus(ss, data); break;
      case 'getAdminData': response = getAdminDashboardData(ss); break;
      case 'updatePlan': response = updateUserPlan(ss, data.phone, data.plan, data.role); break; 
      case 'approvePayment': response = approvePayment(ss, data); break;
      case 'uploadImage': response = uploadImageToDrive(data.base64, data.fileName); break;
      case 'sendChat': response = sendChat(ss, data); break;
      case 'getChat': response = getChat(ss, data.orderId); break;
      case 'getNotifications': response = getNotifications(ss, data.phone); break;
      case 'submitFeedback': response = appendData(ss, 'feedbacks', data); break;
      case 'getFeedbacks': response = getSheetData(ss, 'feedbacks'); break;
      default: response = { status: 'error', message: 'Unknown action' };
    }
  } catch (error) { response = { status: 'error', message: error.toString() }; }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function cleanPhone(phone) { if (!phone) return ''; let c = String(phone).replace(/[^0-9]/g, ''); if (c.startsWith('251')) c = c.substring(3); if (c.startsWith('0')) c = c.substring(1); return c; }

function getSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const h = { 
      'service-taker-users': ['name', 'phone', 'location', 'plan', 'planExpiry', 'ip', 'image', 'joinedAt'], 
      'Service-provider-users': ['name', 'phone', 'service', 'bio', 'location', 'plan', 'planExpiry', 'rating', 'orders', 'ip', 'image', 'joinedAt'], 
      // ADDED paymentMethod TO HEADERS HERE
      'payment-history': ['txnId', 'phone', 'amount', 'plan', 'extractedText', 'paymentMethod', 'status', 'date'], 
      'jobs': ['id', 'title', 'employer', 'employerPhone', 'city', 'budget', 'vacancies', 'description', 'postedAt'], 
      'user-orders': ['id', 'providerName', 'providerPhone', 'takerName', 'takerPhone', 'service', 'status', 'price', 'date'], 
      'job-proposals': ['id', 'jobId', 'jobTitle', 'applicantName', 'applicantPhone', 'employerPhone', 'expectedPay', 'coverNote', 'status', 'date'],
      'chats': ['orderId', 'senderPhone', 'message', 'timestamp'], 
      'notifications': ['phone', 'title', 'message', 'isRead', 'timestamp'],
      'feedbacks': ['name', 'email', 'message', 'date']
    };
    if (h[name]) sheet.appendRow(h[name]);
  }
  return sheet;
}

function registerUser(ss, name, data) { 
  const s = getSheet(ss, name); data.joinedAt = new Date().toISOString(); data.phone = cleanPhone(data.phone); 
  if (name === 'Service-provider-users') { 
      data.rating = 5.0; data.orders = 0; data.plan = 'Pending'; data.planExpiry = ''; 
  } else {
      // Takers get lifetime free access
      data.plan = 'F'; 
      const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 99); 
      data.planExpiry = expiry.toISOString(); 
  }
  const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; 
  s.appendRow(h.map(k => data[k] || '')); 
  return { status: 'success', data }; 
}

function loginUser(ss, data) { 
    const name = data.role === 'provider' ? 'Service-provider-users' : 'service-taker-users'; 
    const s = getSheet(ss, name); const r = s.getDataRange().getValues(); const h = r[0]; 
    for (let i = 1; i < r.length; i++) { 
        if (cleanPhone(r[i][h.indexOf('phone')]) === cleanPhone(data.phone)) { 
            const u = {}; h.forEach((k, j) => u[k] = r[i][j]); u.role = data.role; 
            return { status: 'success', user: u }; 
        } 
    } 
    return { status: 'error', message: 'User not found' }; 
}

function getSheetData(ss, name) { const s = getSheet(ss, name); const r = s.getDataRange().getValues(); if (r.length === 0) return { status: 'success', data: [] }; const h = r.shift(); return { status: 'success', data: r.map(row => { let o = {}; h.forEach((k, i) => o[k] = row[i]); return o; }) }; }
function getFilteredData(ss, name, key, val) { const a = getSheetData(ss, name); if (a.status !== 'success') return a; const c = cleanPhone(val); return { status: 'success', data: a.data.filter(row => key.includes('Phone') ? cleanPhone(row[key]) === c : String(row[key]) === String(val)) }; }
function appendData(ss, name, data) { const s = getSheet(ss, name); const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; s.appendRow(h.map(k => data[k] !== undefined ? data[k] : '')); return { status: 'success' }; }

function updateProfile(ss, data) { 
    const name = data.role === 'provider' ? 'Service-provider-users' : 'service-taker-users'; 
    const s = getSheet(ss, name); const r = s.getDataRange().getValues(); const h = r[0]; const oldPhoneClean = cleanPhone(data.oldPhone); 
    for (let i = 1; i < r.length; i++) { 
        if (cleanPhone(r[i][h.indexOf('phone')]) === oldPhoneClean) { 
            if (data.newName) s.getRange(i + 1, h.indexOf('name') + 1).setValue(data.newName); 
            if (data.newPhone) s.getRange(i + 1, h.indexOf('phone') + 1).setValue(cleanPhone(data.newPhone)); 
            if (data.location !== undefined) s.getRange(i + 1, h.indexOf('location') + 1).setValue(data.location); 
            if (data.image) s.getRange(i + 1, h.indexOf('image') + 1).setValue(data.image); 
            if (data.service && data.role === 'provider') s.getRange(i + 1, h.indexOf('service') + 1).setValue(data.service); 
            if (data.bio && data.role === 'provider') s.getRange(i + 1, h.indexOf('bio') + 1).setValue(data.bio); 
            return { status: 'success' }; 
        } 
    } 
    return { status: 'error', message: 'User not found' }; 
}

function submitPaymentProof(ss, data) { 
    if (data.plan === 'F') { updateUserPlan(ss, data.phone, 'F', data.role); return { status: 'success' }; } 
    const s = getSheet(ss, 'payment-history'); 
    // ADDED data.method TO THE ROW APPENDING
    s.appendRow([data.txnId, cleanPhone(data.phone), data.amount, data.plan, data.extractedText, data.method, 'Pending', new Date().toISOString()]); 
    updateUserPlan(ss, data.phone, 'Pending', data.role); 
    return { status: 'success' }; 
}

function checkPaymentStatus(ss, data) { 
    const name = data.role === 'provider' ? 'Service-provider-users' : 'service-taker-users'; 
    const s = getSheet(ss, name); const r = s.getDataRange().getValues(); const h = r[0]; 
    for (let i = 1; i < r.length; i++) { 
        if (cleanPhone(r[i][h.indexOf('phone')]) === cleanPhone(data.phone)) { 
            return { status: 'success', plan: r[i][h.indexOf('plan')], planExpiry: r[i][h.indexOf('planExpiry')] }; 
        } 
    } 
    return { status: 'error' }; 
}

function updateUserPlan(ss, phone, plan, role) { 
    const name = role === 'provider' ? 'Service-provider-users' : 'service-taker-users'; 
    const s = getSheet(ss, name); const r = s.getDataRange().getValues(); const h = r[0]; 
    for (let i = 1; i < r.length; i++) { 
        if (cleanPhone(r[i][h.indexOf('phone')]) === cleanPhone(phone)) { 
            s.getRange(i + 1, h.indexOf('plan') + 1).setValue(plan); 
            if (['A', 'B', 'C', 'F'].includes(plan)) {
                let days = plan === 'A' ? 7 : plan === 'B' ? 30 : plan === 'C' ? 365 : 36500;
                const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
                s.getRange(i + 1, h.indexOf('planExpiry') + 1).setValue(expiry.toISOString());
            } else { s.getRange(i + 1, h.indexOf('planExpiry') + 1).setValue(''); }
            return { status: 'success' }; 
        } 
    } 
    return { status: 'error' }; 
}

function approvePayment(ss, data) {
    const s = getSheet(ss, 'payment-history'); const r = s.getDataRange().getValues(); const h = r[0];
    for (let i = 1; i < r.length; i++) {
        if (String(r[i][h.indexOf('txnId')]) === String(data.txnId)) {
            s.getRange(i + 1, h.indexOf('status') + 1).setValue(data.plan);
            updateUserPlan(ss, data.phone, data.plan, 'provider');
            return { status: 'success' };
        }
    }
    return { status: 'error' };
}

function applyJob(ss, data) {
    const proposals = getSheet(ss, 'job-proposals'); const id = 'PROP-' + Math.floor(Math.random() * 10000);
    const h = proposals.getRange(1, 1, 1, proposals.getLastColumn()).getValues()[0];
    proposals.appendRow(h.map(k => { if(k === 'id') return id; if(k === 'status') return 'Pending'; if(k === 'date') return new Date().toISOString(); return data[k] || ''; }));
    const ns = getSheet(ss, 'notifications');
    ns.appendRow([data.employerPhone, 'New Proposal', `${data.applicantName} applied for ${data.jobTitle}`, 'false', new Date().toISOString()]);
    return { status: 'success' };
}

function getProposals(ss, employerPhone) {
    const all = getSheetData(ss, 'job-proposals').data || []; const c = cleanPhone(employerPhone);
    return { status: 'success', data: all.filter(p => cleanPhone(p.employerPhone) === c && p.status === 'Pending') };
}

function updateProposalStatus(ss, data) {
    const s = getSheet(ss, 'job-proposals'); const r = s.getDataRange().getValues(); const h = r[0];
    for (let i = 1; i < r.length; i++) {
        if (String(r[i][h.indexOf('id')]) === String(data.propId)) {
            s.getRange(i + 1, h.indexOf('status') + 1).setValue(data.status);
            const applicantName = r[i][h.indexOf('applicantName')]; const applicantPhone = r[i][h.indexOf('applicantPhone')]; const jobTitle = r[i][h.indexOf('jobTitle')]; const employerPhone = r[i][h.indexOf('employerPhone')]; const expectedPay = r[i][h.indexOf('expectedPay')];
            const ns = getSheet(ss, 'notifications');
            if (data.status === 'Accepted') {
                const orderId = 'ORD-' + Math.floor(Math.random() * 10000); const orders = getSheet(ss, 'user-orders'); const oh = orders.getRange(1, 1, 1, orders.getLastColumn()).getValues()[0];
                orders.appendRow(oh.map(k => { if(k === 'id') return orderId; if(k === 'providerName') return data.providerName || 'Provider'; if(k === 'providerPhone') return employerPhone; if(k === 'takerName') return applicantName; if(k === 'takerPhone') return applicantPhone; if(k === 'service') return jobTitle; if(k === 'status') return 'accepted'; if(k === 'price') return expectedPay; if(k === 'date') return new Date().toISOString().split('T')[0]; return ''; }));
                ns.appendRow([applicantPhone, 'Proposal Accepted', `Your proposal for ${jobTitle} was accepted! Contact unlocked.`, 'false', new Date().toISOString()]);
            } else { ns.appendRow([applicantPhone, 'Proposal Declined', `Your proposal for ${jobTitle} was not accepted.`, 'false', new Date().toISOString()]); }
            return { status: 'success' };
        }
    }
    return { status: 'error' };
}

function uploadImageToDrive(base64, fileName) {
  try {
    if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') return { status: 'error', message: 'Drive Folder ID missing in code.gs' };
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID); const splitBase64 = base64.split(',');
    const contentType = splitBase64[0].match(/:(.*?);/)[1]; const bytes = Utilities.base64Decode(splitBase64[1]);
    let ext = ".png"; if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
    const blob = Utilities.newBlob(bytes, contentType, fileName + "_" + Date.now() + ext);
    const file = folder.createFile(blob); try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return { status: 'success', url: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000` };
  } catch(e) { return { status: 'error', message: e.toString() }; }
}

function sendChat(ss, data) { const s = getSheet(ss, 'chats'); s.appendRow([data.orderId, cleanPhone(data.senderPhone), data.message, new Date().toISOString()]); return { status: 'success' }; }
function getChat(ss, orderId) { const all = getSheetData(ss, 'chats').data || []; const filtered = all.filter(c => String(c.orderId) === String(orderId)); filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); return { status: 'success', data: filtered }; }
function getNotifications(ss, phone) { const all = getSheetData(ss, 'notifications').data || []; const clean = cleanPhone(phone); const filtered = all.filter(n => cleanPhone(n.phone) === clean).slice(-5).reverse(); return { status: 'success', data: filtered }; }

function getAdminDashboardData(ss) { 
    const takers = getSheetData(ss, 'service-taker-users').data || [], providers = getSheetData(ss, 'Service-provider-users').data || [], jobs = getSheetData(ss, 'jobs').data || [], orders = getSheetData(ss, 'user-orders').data || [], payments = getSheetData(ss, 'payment-history').data || [], feedbacks = getSheetData(ss, 'feedbacks').data || []; 
    const tiers = { F: 0, A: 0, B: 0, C: 0, Pending: 0, Fail: 0 }; providers.forEach(p => { if (tiers[p.plan] !== undefined) tiers[p.plan]++; else tiers.Pending++; }); 
    
    const badgeAnalytics = providers.map(p => { 
        let w = payments.filter(x => cleanPhone(x.phone) === cleanPhone(p.phone) && x.plan === 'A' && x.status === 'A').length;
        let m = payments.filter(x => cleanPhone(x.phone) === cleanPhone(p.phone) && x.plan === 'B' && x.status === 'B').length;
        let y = payments.filter(x => cleanPhone(x.phone) === cleanPhone(p.phone) && x.plan === 'C' && x.status === 'C').length;
        let total = (w * 49) + (m * 149) + (y * 1200); 
        return { name: p.name, phone: p.phone, weekCount: w, monthCount: m, yearCount: y, totalPaid: total, hasBadge: (y >= 1 || m >= 6 || w >= 25) }; 
    }).sort((a, b) => b.totalPaid - a.totalPaid); 
    
    const pendingPayments = payments.filter(p => p.status === 'Pending');
    
    return { status: 'success', data: { 
        metrics: { 
            totalOrders: orders.length, 
            acceptedOrders: orders.filter(o => o.status === 'accepted').length, 
            declinedOrders: orders.filter(o => o.status === 'declined').length, 
            totalProviders: providers.length, 
            pendingProviders: tiers.Pending, 
            totalJobs: jobs.length, 
            openJobs: jobs.length - jobs.filter(j => parseInt(j.vacancies) === 0).length, 
            filledJobs: jobs.filter(j => parseInt(j.vacancies) === 0).length, 
            totalTakers: takers.length 
        }, 
        tiers, 
        providers, 
        takers, 
        badgeAnalytics, 
        pendingPayments, 
        feedbacks 
    }}; 
}