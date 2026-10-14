
(() => {
  const root = document.documentElement;
  const control = document.querySelector('#motion-toggle');
  const motionControls = [control,document.querySelector('#motion-stage-toggle')].filter(Boolean);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const visual = document.querySelector('.hero-visual');
  const layer = document.querySelector('.hero-depth-layer');
  if (!control || !visual || !layer) return;
  let manuallyPaused = false;
  let heroVisible = true;
  let pointerFrame = 0;
  let position = { x: 0, y: 0 };
  let tilt;
  const isPaused = () => manuallyPaused || reduced.matches || document.hidden;
  function resetTilt() { if(pointerFrame) cancelAnimationFrame(pointerFrame); pointerFrame=0; tilt?.cancel(); tilt=undefined; }
  function syncMotion() {
    const paused=isPaused();
    root.classList.toggle('motion-paused', paused);
    for(const button of motionControls){
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label', reduced.matches ? 'Animações reduzidas pela preferência do dispositivo' : manuallyPaused ? 'Ativar animações' : 'Pausar animações');
      button.querySelector('.motion-control-icon').textContent=paused?'▷':'Ⅱ';
      button.querySelector('.motion-control-label').textContent=reduced.matches?'Movimento reduzido':paused?'Ativar animações':'Pausar animações';
      button.disabled=reduced.matches;
    }
    if(paused)resetTilt();
    document.dispatchEvent(new CustomEvent('heads:motionchange',{detail:{paused}}));
  }
  for(const button of motionControls)button.hidden=false;
  root.classList.add('motion-ready');
  for(const button of motionControls)button.addEventListener('click',()=>{manuallyPaused=!manuallyPaused;syncMotion();});
  reduced.addEventListener('change',syncMotion);
  fine.addEventListener('change',resetTilt);
  document.addEventListener('visibilitychange',syncMotion);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('motion-offscreen',!entry.isIntersecting);if(entry.target===visual){heroVisible=entry.isIntersecting;if(!heroVisible)resetTilt();}}},{rootMargin:'0px'});
    observer.observe(visual);const ecosystem=document.querySelector('.ecosystem-3d');if(ecosystem)observer.observe(ecosystem);
  }
  visual.addEventListener('pointermove',event=>{
    if(isPaused()||!fine.matches||!heroVisible||event.pointerType==='touch')return;
    const rect=visual.getBoundingClientRect();
    position={x:Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1)),y:Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1))};
    if(pointerFrame)return;
    pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(isPaused()||!heroVisible)return;tilt?.cancel();tilt=layer.animate([{transform:`rotateX(${-position.y*2}deg) rotateY(${position.x*3}deg) translate3d(${position.x*4}px,${position.y*3}px,0)`}],{duration:250,fill:'forwards',easing:'ease-out'});});
  },{passive:true});
  visual.addEventListener('pointerleave',resetTilt,{passive:true});
  window.addEventListener('pagehide',resetTilt);
  syncMotion();
})();

