
(()=>{const root=document.documentElement,b=document.getElementById('theme-toggle'),meta=document.querySelector('meta[name="theme-color"]');if(!b)return;
const sync=()=>{const l=root.dataset.theme==='light';b.setAttribute('aria-label',l?'Ativar modo escuro':'Ativar modo claro');b.querySelector('.tt-label').textContent=l?'Modo escuro':'Modo claro';b.setAttribute('aria-pressed',String(l));if(meta)meta.content=l?'#f3f6fa':'#08111f';};
const apply=n=>{root.dataset.theme=n;try{localStorage.setItem('ra-theme',n)}catch(e){}sync();};
b.addEventListener('click',()=>{const n=root.dataset.theme==='light'?'dark':'light';const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!document.startViewTransition||reduce){root.classList.add('theme-anim');apply(n);setTimeout(()=>root.classList.remove('theme-anim'),500);return;}
 const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,rad=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 document.startViewTransition(()=>apply(n)).ready.then(()=>root.animate({clipPath:['circle(0px at '+x+'px '+y+'px)','circle('+rad+'px at '+x+'px '+y+'px)']},{duration:700,easing:'cubic-bezier(.2,.75,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
});sync();})();
