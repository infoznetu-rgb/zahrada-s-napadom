const menu=document.querySelector('.menu');
const mobile=document.querySelector('#mobile-nav');
if(menu&&mobile){
  menu.addEventListener('click',()=>{
    const open=mobile.classList.toggle('is-open');
    menu.setAttribute('aria-expanded',String(open));
  });
  mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobile.classList.remove('is-open');
    menu.setAttribute('aria-expanded','false');
  }));
}

const form=document.querySelector('#idea-form');
if(form){
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    alert('Toto je zatiaľ iba prvý návrh. Formulár ešte nič neposiela. V ostrej verzii sa každý príspevok uloží ako čakajúci na tvoje schválenie.');
  });
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}