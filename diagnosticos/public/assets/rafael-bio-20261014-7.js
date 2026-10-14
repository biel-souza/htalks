
(()=>{
const cv=document.getElementById('eco2d');if(!cv)return;const stage=cv.closest('.ecosystem-stage');const ctx=cv.getContext('2d');if(!ctx)return;
const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
let W=0,H=0,cx=0,cy=0,R=0,time=0,last=0,raf=0,visible=true,paused=root.classList.contains('motion-paused');
let px=0,py=0,tx=0,ty=0,anchors=[];
const COL=[[131,229,243],[117,170,249],[169,172,255]];
const rgba=(c,a)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')';
const N=760,pts=[];for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,r=Math.sqrt(1-y*y),p=i*2.399963;pts.push([Math.cos(p)*r,y,Math.sin(p)*r]);}
const ll=(la,lo)=>{la*=Math.PI/180;lo*=Math.PI/180;return[Math.cos(la)*Math.cos(lo),Math.sin(la),Math.cos(la)*Math.sin(lo)]};
const nodes=[ll(38,-20),ll(12,40),ll(-22,10),ll(52,95),ll(-8,130),ll(28,180),ll(-40,-70),ll(5,-110),ll(-55,160),ll(60,-140),ll(-20,75),ll(20,-55)];
const links=[[0,1],[1,2],[0,2],[1,3],[3,5],[4,10],[2,10],[5,9],[9,0],[6,2],[7,11],[11,0],[6,8],[4,8],[7,9],[10,1]];
const arcs=links.map(([a,b],k)=>{const A=nodes[a],B=nodes[b];const d=Math.acos(Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2])));const s=Math.sin(d)||1;const S=[];for(let i=0;i<=40;i++){const u=i/40,f1=Math.sin((1-u)*d)/s,f2=Math.sin(u*d)/s,h=1+Math.sin(Math.PI*u)*.16*d;S.push([(A[0]*f1+B[0]*f2)*h,(A[1]*f1+B[1]*f2)*h,(A[2]*f1+B[2]*f2)*h]);}return{S,c:COL[k%3],sp:.18+(k%5)*.035,ph:k*.37};});
let yaw=0,tilt=.38;
function P(p){const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(tilt),sb=Math.sin(tilt);const x=p[0]*ca+p[2]*sa,z1=-p[0]*sa+p[2]*ca;const y=p[1]*cb-z1*sb,z=p[1]*sb+z1*cb;const k=3.2/(3.2-z);return[cx+x*R*k,cy-y*R*k,z];}
function resize(){const r=stage.getBoundingClientRect();W=r.width;H=r.height;if(!W||!H)return;const d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(W*d);cv.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);cx=W/2;cy=H*.48;R=Math.min(W,H)*.29;
 anchors=[...stage.querySelectorAll('.scene-label')].map((el,i)=>{const b=el.getBoundingClientRect();const mx=b.top-r.top+b.height/2;const left=b.left-r.left+b.width/2<cx;return{x:left?b.right-r.left+8:b.left-r.left-8,y:mx,c:COL[i%3]};});draw();}
function ring(rad,tl,spin,c,front){const n=120;ctx.lineWidth=1;for(let i=0;i<n;i++){const a1=i/n*Math.PI*2+spin,a2=(i+1)/n*Math.PI*2+spin;const q=[a1,a2].map(a=>{const p=[Math.cos(a)*rad,0,Math.sin(a)*rad];const cb=Math.cos(tl),sb=Math.sin(tl);const y=p[1]*cb-p[2]*sb,z=p[1]*sb+p[2]*cb;const k=3.2/(3.2-z);return[cx+p[0]*R*k,cy-y*R*k,z]});const z=(q[0][2]+q[1][2])/2;if((z>=0)!==front)continue;const tick=i%5===0;ctx.strokeStyle=rgba(c,front?.18+.35*z/rad:.07);ctx.beginPath();ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);ctx.stroke();if(tick){const dx=q[0][0]-cx,dy=q[0][1]-cy,l=Math.hypot(dx,dy)||1,L=i%15===0?7:3.5;ctx.beginPath();ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[0][0]+dx/l*L,q[0][1]+dy/l*L);ctx.stroke();}}
 const a=spin*-2.4;const p=[Math.cos(a)*rad,0,Math.sin(a)*rad];const cb=Math.cos(tl),sb=Math.sin(tl);const y=-p[2]*sb,z=p[2]*cb;if((z>=0)===front){const k=3.2/(3.2-z);const X=cx+p[0]*R*k,Y=cy-y*R*k;glowDot(X,Y,front?2.6:1.6,c,front?1:.35);}}
function glowDot(x,y,r,c,a){const g=ctx.createRadialGradient(x,y,0,x,y,r*5);g.addColorStop(0,rgba(c,.55*a));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*5,0,7);ctx.fill();ctx.fillStyle=rgba([235,252,255],a);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
function draw(){if(!W)return;ctx.clearRect(0,0,W,H);
 const g=ctx.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.9);g.addColorStop(0,'rgba(40,140,220,.20)');g.addColorStop(1,'rgba(40,140,220,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ring(1.5,tilt+.5,time*.05,COL[1],false);ring(1.28,tilt-.9,-time*.07,COL[0],false);
 const scan=Math.sin(time*.55)*.95;
 for(const p of pts){const q=P(p);if(q[2]>=0)continue;ctx.fillStyle=rgba(COL[0],.10);ctx.fillRect(q[0]-.5,q[1]-.5,1,1);}
 const bg=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R*1.05);bg.addColorStop(0,'rgba(24,66,110,.80)');bg.addColorStop(.7,'rgba(8,22,42,.86)');bg.addColorStop(1,'rgba(6,14,28,.9)');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,R*1.01,0,7);ctx.fill();
 for(const p of pts){const q=P(p);if(q[2]<0)continue;const sc=Math.max(0,1-Math.abs(p[1]-scan)*9);const a=.16+.55*q[2]+sc*.6;const s=.8+1.1*q[2]+sc*.6;ctx.fillStyle=rgba(sc>.2?[200,250,255]:COL[0],Math.min(1,a));ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s);}
 for(const la of[0,35,-35]){ctx.lineWidth=la?.7:1;let prev=null;for(let i=0;i<=72;i++){const q=P(ll(la,i*5));if(prev&&q[2]>0&&prev[2]>0){ctx.strokeStyle=rgba(COL[0],(la?.12:.28)*(.3+q[2]));ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}prev=q;}}
 const rim=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);rim.addColorStop(0,'rgba(160,240,250,.65)');rim.addColorStop(.5,'rgba(117,170,249,.15)');rim.addColorStop(1,'rgba(169,172,255,.5)');ctx.strokeStyle=rim;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(cx,cy,R*1.01,0,7);ctx.stroke();
 for(const A of arcs){const Q=A.S.map(P);ctx.lineWidth=1;for(let i=1;i<Q.length;i++){const z=(Q[i][2]+Q[i-1][2])/2;if(z<-.05)continue;ctx.strokeStyle=rgba(A.c,.12+.35*Math.max(0,z));ctx.beginPath();ctx.moveTo(Q[i-1][0],Q[i-1][1]);ctx.lineTo(Q[i][0],Q[i][1]);ctx.stroke();}
  const u=(time*A.sp+A.ph)%1,hi=Math.floor(u*40);for(let k=0;k<7;k++){const j=hi-k;if(j<1)break;const z=Q[j][2];if(z<0)continue;ctx.strokeStyle=rgba([220,250,255],(1-k/7)*.9*(.4+z));ctx.lineWidth=1.8-k*.18;ctx.beginPath();ctx.moveTo(Q[j-1][0],Q[j-1][1]);ctx.lineTo(Q[j][0],Q[j][1]);ctx.stroke();}}
 nodes.forEach((n,i)=>{const q=P(n);if(q[2]<.05)return;const pu=(time*.6+i*.29)%1;ctx.strokeStyle=rgba(COL[i%3],(1-pu)*.6*q[2]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(q[0],q[1],2+pu*9,0,7);ctx.stroke();glowDot(q[0],q[1],1.6+q[2],COL[i%3],.5+.5*q[2]);});
 anchors.forEach((h,i)=>{const dx=h.x-cx,dy=h.y-cy,l=Math.hypot(dx,dy)||1;const ex=cx+dx/l*R*1.04,ey=cy+dy/l*R*1.04;const mx=(ex+h.x)/2+(-dy/l)*18,my=(ey+h.y)/2+(dx/l)*18;
  ctx.setLineDash([2,4]);ctx.lineDashOffset=-time*14;ctx.strokeStyle=rgba(h.c,.45);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ex,ey);ctx.quadraticCurveTo(mx,my,h.x,h.y);ctx.stroke();ctx.setLineDash([]);
  for(let k=0;k<2;k++){const u=(time*.32+k*.5+i*.21)%1;const x=(1-u)*(1-u)*ex+2*(1-u)*u*mx+u*u*h.x,y=(1-u)*(1-u)*ey+2*(1-u)*u*my+u*u*h.y;glowDot(x,y,1.5,h.c,Math.sin(Math.PI*u));}
  glowDot(ex,ey,1.8,h.c,.9);const pu=(time*.5+i*.33)%1;ctx.strokeStyle=rgba(h.c,(1-pu)*.7);ctx.beginPath();ctx.arc(h.x,h.y,3+pu*8,0,7);ctx.stroke();glowDot(h.x,h.y,2.2,h.c,1);});
 ring(1.5,tilt+.5,time*.05,COL[1],true);ring(1.28,tilt-.9,-time*.07,COL[0],true);
}
const can=()=>visible&&!paused&&!reduced.matches&&!document.hidden;
function loop(now){raf=0;if(!can())return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;time+=dt;tx+=(px-tx)*.06;ty+=(py-ty)*.06;yaw=time*.12+tx;tilt=.38+ty;draw();raf=requestAnimationFrame(loop);}
function sync(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(can())raf=requestAnimationFrame(loop);else draw();}
stage.classList.add('is-webgl');
new ResizeObserver(resize).observe(stage);
if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);sync();},{threshold:.05}).observe(stage);
document.addEventListener('heads:motionchange',e=>{paused=!!e.detail?.paused;sync();});
document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);
stage.addEventListener('pointermove',e=>{if(!fine.matches)return;const r=stage.getBoundingClientRect();px=((e.clientX-r.left)/r.width*2-1)*.35;py=((e.clientY-r.top)/r.height*2-1)*.18;},{passive:true});
stage.addEventListener('pointerleave',()=>{px=0;py=0;},{passive:true});
time=4;resize();sync();
})();
