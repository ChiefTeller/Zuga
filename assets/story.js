/* Components inside the first new reel. No external dependencies. */
(()=>{'use strict';
 const root=document.querySelector('.reel-framework');if(!root)return;
 const controls=[...root.querySelectorAll('.framework-component')];
 const defs=[...root.querySelectorAll('.framework-definition')];
 const activate=symbol=>{
   controls.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.concept===symbol)));
   defs.forEach(item=>item.classList.toggle('active',item.dataset.definition===symbol));
 };
 controls.forEach((button,i)=>{
   button.addEventListener('click',()=>activate(button.dataset.concept));
   button.addEventListener('keydown',event=>{
     if(!['ArrowRight','ArrowLeft'].includes(event.key))return;
     event.preventDefault();
     const next=(i+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length;
     activate(controls[next].dataset.concept);controls[next].focus();
   });
 });
})();
