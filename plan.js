if (localStorage.getItem('tiguseratega_theme') === 'dark') document.documentElement.classList.add('dark');
function selectPlan(code, price) { 
    localStorage.setItem('selectedPlanCode', code); 
    localStorage.setItem('selectedPlanPrice', price); 
    if(code === 'F') window.location.href = 'verify.html?free=true'; 
    else window.location.href = 'payment.html'; 
}
lucide.createIcons();