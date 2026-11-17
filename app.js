const toast=document.getElementById('toast');let timer;
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2800)}
document.getElementById('cartBtn').addEventListener('click',()=>notify('Кошик поки порожній — меню вже готується 🍕'));
document.getElementById('langBtn').addEventListener('click',()=>notify('Перемикач мов буде активовано перед запуском.'));
document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('nav').classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav').classList.remove('open')));
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}}));