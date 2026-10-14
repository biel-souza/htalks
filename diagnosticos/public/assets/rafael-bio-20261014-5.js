
(()=>{
const root=document.documentElement;
if(!root.classList.contains('anim-on'))return;
root.classList.add('anim-ready');
const ease=t=>t>=1?1:1-Math.pow(2,-10*t);
const paused=()=>root.classList.contains('motion-paused');
const h1=document.querySelector('.hero h1');
if(h1){const frag=document.createDocumentFragment();let i=0;
 const wrap=n=>{const o=document.createElement('span');o.className='w';const w=document.createElement('span');w.className='wi';w.style.setProperty('--d',(0.14+i++*0.055).toFixed(3)+'s');w.append(n);o.append(w);return o;};
 h1.setAttribute('aria-label',h1.textContent.replace(/\s+/g,' ').trim());
 [...h1.childNodes].forEach(n=>{if(n.nodeType===3)n.textContent.split(/(\s+)/).forEach(p=>{if(!p)return;frag.append(/^\s+$/.test(p)?' ':wrap(document.createTextNode(p)))});else frag.append(wrap(n.cloneNode(true)));});
 h1.replaceChildren(frag);h1.classList.add('split');}
const go=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('hero-in')));
const img=document.querySelector('.hero-robot');
Promise.race([img&&img.decode?img.decode():Promise.resolve(),new Promise(r=>setTimeout(r,700))]).catch(()=>{}).finally(go);
function count(el){const s=el.querySelector('strong');const n=s&&s.firstChild;if(!n||n.nodeType!==3)return;const target=parseInt(n.textContent,10);if(!target)return;n.textContent='0';const t0=performance.now()+250,dur=1700;const tick=now=>{const p=Math.min(1,Math.max(0,(now-t0)/dur));n.textContent=String(Math.round(ease(p)*target));if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);}
const targets=[...document.querySelectorAll('.credibility-intro,.credential,.ecosystem-copy>*:not(ul),.ecosystem-services li,.ecosystem-stage,.ecosystem-caption,.ecosystem-disclaimer,.section-heading>*,.approach-steps article,.ecosystem-line,.diagnostic-intro>*,.form-panel,.faq>div:first-child>*,.faq details,.site-footer>*')];
if('IntersectionObserver' in window){
 const io=new IntersectionObserver(es=>{es.filter(e=>e.isIntersecting).sort((a,b)=>(a.boundingClientRect.top-b.boundingClientRect.top)||(a.boundingClientRect.left-b.boundingClientRect.left)).forEach((e,k)=>{const el=e.target;el.style.setProperty('--d',Math.min(k*0.08,0.56)+'s');el.classList.add('is-in');io.unobserve(el);if(el.classList.contains('credential'))count(el);});},{rootMargin:'0px 0px -8% 0px',threshold:0});
 targets.forEach(el=>io.observe(el));
}else targets.forEach(el=>el.classList.add('is-in'));
const sp=document.createElement('div');sp.className='scroll-progress';sp.setAttribute('aria-hidden','true');document.body.prepend(sp);
let raf=0;const onS=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=root.scrollHeight-innerHeight;sp.style.transform='scaleX('+(h>0?Math.min(1,scrollY/h):0)+')';});};
addEventListener('scroll',onS,{passive:true});addEventListener('resize',onS,{passive:true});onS();
const form=document.querySelector('#diagnostic-form');const prog=document.querySelector('#progress');let upd=()=>{};
if(prog){const bar=document.createElement('div');bar.className='pbar';bar.setAttribute('aria-hidden','true');bar.append(document.createElement('i'));prog.after(bar);prog.classList.add('pnative');upd=()=>{bar.firstChild.style.width=(prog.value/prog.max*100)+'%'};upd();new MutationObserver(upd).observe(prog,{attributes:true});}
if(form){const steps=[...form.querySelectorAll('.form-step')];let cur=steps.findIndex(s=>!s.hidden);
 const mo=new MutationObserver(()=>{const n=steps.findIndex(s=>!s.hidden);if(n>=0&&n!==cur){form.style.setProperty('--dx',(n>cur?28:-28)+'px');cur=n;}upd();});
 steps.forEach(s=>mo.observe(s,{attributes:true,attributeFilter:['hidden']}));}
const err=document.querySelector('#form-error');
if(err)new MutationObserver(()=>{if(!err.hidden&&!paused())err.animate([{translate:'0 0'},{translate:'-7px 0'},{translate:'6px 0'},{translate:'-3px 0'},{translate:'0 0'}],{duration:420,easing:'ease-out'});}).observe(err,{childList:true});
document.querySelectorAll('.faq details').forEach(d=>{const s=d.querySelector('summary');let anim=null;
 s.addEventListener('click',ev=>{if(paused())return;ev.preventDefault();if(anim)return;const start=d.offsetHeight;d.style.overflow='hidden';
  const done=()=>{anim=null;d.style.overflow='';};
  if(!d.open){d.open=true;const end=d.offsetHeight;anim=d.animate({height:[start+'px',end+'px']},{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'});const p=d.querySelector('p');p&&p.animate({opacity:[0,1],translate:['0 -6px','0 0']},{duration:460,delay:60,easing:'ease-out',fill:'backwards'});anim.onfinish=done;}
  else{d.classList.add('is-closing');const end=s.offsetHeight+1;anim=d.animate({height:[start+'px',end+'px']},{duration:340,easing:'cubic-bezier(.4,0,.2,1)'});anim.onfinish=()=>{d.open=false;d.classList.remove('is-closing');done();};}
 });});
})();
