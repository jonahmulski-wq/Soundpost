/* Waveform and trim: the two trim handles, fine-trim zoom, magnifier, beat lines, snap-to-beat while dragging, and "hear the cut". */
import {stopPlay,touch} from './preview.js';
import {live,raw} from './record.js';
import {PRE,RP,XF,repDragged,setT} from './repeat/repeat.js';
import {$,AC} from './util.js';


export function draw(d){const c=$('cv'),k=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*k;c.height=h*k;
  const g=c.getContext('2d');g.scale(k,k);g.clearRect(0,0,w,h);
  g.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--acc');
  if(!d){g.globalAlpha=.4;g.fillRect(0,h/2-.5,w,1);return}
  const step=Math.max(1,Math.floor(d.length/w));
  for(let x=0;x<w;x++){let m=0;for(let i=x*step;i<Math.min(d.length,(x+1)*step);i++){const a=Math.abs(d[i]);if(a>m)m=a}
    const bh=Math.max(1,m*h*.95);g.fillRect(x,(h-bh)/2,1,bh)}}
const BEATC='#7a2cff',STRIP=36;  // vivid violet: stands out on green, white and gray
/* ---- Trim: two handles on the waveform (values stay in ts/te, 0-1000) ---- */
const knobX=(id,x,w,kw)=>id==='s'?(x-kw<0?x:x-kw):(x+kw>w?x-kw:x);
export const T={act:'s',drag:null,fine:null,timer:0,pk:null,pkw:0,src:null,play:null};
export const tDur=()=>raw.data.length/raw.sr;
const fineSpan=()=>Math.min(2,tDur()*.4);
function tView(){return T.fine!==null?{a:T.fine,span:fineSpan()}:{a:0,span:tDur()}}
function tGap(){return Math.min(10,100/tDur())}  // keep at least 0.1 s (or 1% of short clips)
function peaksFor(a,span,w){const d=raw.data,sr=raw.sr,p=new Float32Array(w);
  for(let x=0;x<w;x++){const i0=Math.max(0,Math.floor((a+x/w*span)*sr)),i1=Math.min(d.length,Math.floor((a+(x+1)/w*span)*sr));let m=0;
    for(let i=i0;i<i1;i++){const v=d[i]<0?-d[i]:d[i];if(v>m)m=v}p[x]=m}return p}
function wavePeaks(v,w){if(v.a===0&&v.span===tDur()){if(!T.pk||T.pkw!==w){T.pk=peaksFor(0,v.span,w);T.pkw=w}return T.pk}return peaksFor(v.a,v.span,w)}
function paintTrim(c,w,H,v,opt){const k=devicePixelRatio||1;if(c.width!==Math.round(w*k)||c.height!==Math.round(H*k)){c.width=Math.round(w*k);c.height=Math.round(H*k)}
  const g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,w,H);const st=opt.mag?0:STRIP,h=H-st;  // h = waveform area; below it the grab-dot strip
  const cs=getComputedStyle(document.documentElement),acc=cs.getPropertyValue('--acc'),ink=cs.getPropertyValue('--ink'),red=cs.getPropertyValue('--rec');
  const p=opt.mag?peaksFor(v.a,v.span,w):wavePeaks(v,w),du=tDur(),X=t=>(t-v.a)/v.span*w;
  g.fillStyle=acc;for(let x=0;x<w;x++){const t=v.a+x/w*v.span;if(t<0||t>du)continue;const bh=Math.max(1,p[x]*h*.95);g.fillRect(x,(h-bh)/2,1,bh)}
  const xs=X(du*$('ts').value/1000),xe=X(du*$('te').value/1000);
  g.fillStyle='rgba(120,120,120,.6)';if(xs>0)g.fillRect(0,0,Math.min(w,xs),h);if(xe<w)g.fillRect(Math.max(0,xe),0,w-Math.max(0,xe),h);
  [['s',xs],['e',xe]].forEach(([id,x])=>{if(x<-20||x>w+20)return;const on=id===T.act;
    g.globalAlpha=on?1:.65;g.fillStyle=on?ink:ink;g.fillRect(x-(on?1.5:1),0,on?3:2,h+(st?st-14:0));
    if(st){g.beginPath();g.arc(Math.max(9,Math.min(w-9,x)),h+st-12,on?9:8,0,2*Math.PI);g.fill()}  // grab dot below the panel
    if(!opt.mag){const kw=14,kh=30,kx=knobX(id,x,w,kw);g.fillStyle=on?ink:ink;g.beginPath();
      if(g.roundRect)g.roundRect(kx,(h-kh)/2,kw,kh,4);else g.rect(kx,(h-kh)/2,kw,kh);g.fill();
      g.fillStyle=cs.getPropertyValue('--panel');g.fillRect(kx+5,(h-12)/2,1.5,12);g.fillRect(kx+8,(h-12)/2,1.5,12)}
    g.globalAlpha=1});
  if(RP.lines&&$('repbeat').checked){g.fillStyle=BEATC;const bh=Math.max(8,h*.3);for(const L of RP.lines){const x=X(L.t-PRE);if(x<-2||x>w+2)continue;g.fillRect(x-1,0,2,bh)}}  // violet beat lines along the top, at the cut point, on top of the handles
  if(T.play!==null){const x=X(T.play);g.fillStyle=red;g.fillRect(x-1,0,2,h)}}
export function drawTrim(){if(!raw||live)return;const c=$('cv');paintTrim(c,c.clientWidth,c.clientHeight,tView(),{})}
/* Magnifier above the trim box: small for rough trim, grows and zooms further for fine trim. MG.g runs 0 (rough) to 1 (fine). */
const MG={g:0,cx:0,off:true,raf:0,last:0};
function showMag(cx){MG.cx=cx;MG.off=false;$('maglab').textContent=T.fine!==null?'Fine trim':'Rough trim';magDraw();magRun()}
function hideMag(){MG.off=true;if(MG.g)magRun();else magGone()}
function magGone(){cancelAnimationFrame(MG.raf);MG.raf=0;MG.g=0;MG.off=true;$('mag').hidden=$('maglab').hidden=true}
function magRun(){if(!MG.raf){MG.last=performance.now();MG.raf=requestAnimationFrame(magStep)}}
function magStep(now){MG.raf=0;if(!raw||live){magGone();return}
  const to=!MG.off&&T.fine!==null?1:0,d=Math.max(0,now-MG.last)/250;MG.last=now;
  MG.g=to>MG.g?Math.min(to,MG.g+d):Math.max(to,MG.g-d);
  if(MG.off&&!MG.g){magGone();return}
  magDraw();if(MG.g!==to)MG.raf=requestAnimationFrame(magStep)}
function magDraw(){const m=$('mag'),l=$('maglab'),r=$('cv').getBoundingClientRect(),e=MG.g*MG.g*(3-2*MG.g),w=Math.round(120+70*e),h=Math.round(52+32*e),
    t=tDur()*$(T.act==='s'?'ts':'te').value/1000,a=Math.max(.02,tDur()/6),b=Math.max(.02,fineSpan()/6),sp=a*Math.pow(b/a,e),
    left=Math.max(4,Math.min(innerWidth-w-6,MG.cx-w/2)),top=Math.max(30,r.top-h-10);
  m.hidden=l.hidden=false;m.style.width=w+'px';m.style.height=h+'px';m.style.left=left+'px';m.style.top=top+'px';
  l.style.left=Math.max(50,Math.min(innerWidth-50,left+w/2))+'px';l.style.top=(top-28)+'px';
  paintTrim(m,w,h,{a:t-sp/2,span:sp},{mag:true})}
function trimText(){const du=tDur(),a=du*$('ts').value/1000,b=du*$('te').value/1000;
  $('tinfo').textContent='Keeping '+a.toFixed(2)+'s to '+b.toFixed(2)+'s of '+du.toFixed(1)+'s'}
export function updTrim(){if(!raw)return;drawTrim();trimText();touch()}
export function trimReset(){hearStop();T.pk=null;T.act='s';T.fine=null;T.drag=null;magGone();$('cv').classList.add('trim')}
function setHandle(h,pm){const g=tGap(),s=+$('ts').value,e=+$('te').value;
  pm=h==='s'?Math.max(0,Math.min(pm,e-g)):Math.min(1000,Math.max(pm,s+g));$(h==='s'?'ts':'te').value=Math.round(pm*1000)/1000}
/* Snap while sliding (Repeat in time on): handles jump from beat line to beat line, with a short buzz on phones that support it (not iPhone). */
const snapOn=()=>!!(RP.lines&&RP.lines.length&&$('rep').checked&&$('repbeat').checked&&!$('repkeep').checked);
const cutOf=(id,i)=>RP.lines[i].t-PRE+(id==='e'?XF:0);   // Start sits PRE before the note; End adds the crossfade
function nearLine(t){const L=RP.lines;let b=0;for(let i=1;i<L.length;i++)if(Math.abs(L[i].t-t)<Math.abs(L[b].t-t))b=i;return b}
function handleLine(id){const du=tDur();return nearLine(du*$(id==='s'?'ts':'te').value/1000+PRE-(id==='e'?XF:0))}
function snapHandle(d,t){const L=RP.lines,du=tDur();let i=nearLine(t+PRE-(d.h==='e'?XF:0));
  if(d.h==='s')i=Math.min(i,handleLine('e')-1);else i=Math.max(i,handleLine('s')+1);
  i=Math.max(0,Math.min(L.length-1,i));const tt=cutOf(d.h,i);if(tt<0&&d.h==='e'||tt>du)return;
  setT(d.h==='s'?'ts':'te',tt);if(i!==d.li){d.li=i;try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}}}
function holdTimer(){clearTimeout(T.timer);if(T.fine!==null)return;
  T.timer=setTimeout(()=>{const d=T.drag;if(!d||fineSpan()>=tDur()*.9)return;const w=$('cv').clientWidth,t=tDur()*$(d.h==='s'?'ts':'te').value/1000;
    T.fine=t-(d.x+d.off)/w*fineSpan();drawTrim();showMag(d.cx)},500)}
const cvx=e=>e.clientX-$('cv').getBoundingClientRect().left;
$('cv').addEventListener('pointerdown',e=>{if(!raw||live)return;const w=$('cv').clientWidth,v=tView(),du=tDur(),x=cvx(e);
  const hx={s:(du*$('ts').value/1000-v.a)/v.span*w,e:(du*$('te').value/1000-v.a)/v.span*w};
  // knobs sit on the gray (cut) side of each line, so measure to the knob's middle
  const low=e.clientY-$('cv').getBoundingClientRect().top>$('cv').clientHeight-STRIP,mid=id=>low?hx[id]:knobX(id,hx[id],w,14)+7;  // in the dot strip, measure to the line itself
  const ds=Math.abs(x-mid('s')),de=Math.abs(x-mid('e')),h=ds<de||(ds===de&&x<hx.s)?'s':'e';
  if(Math.min(ds,de)>34)return;
  e.preventDefault();try{$('cv').setPointerCapture(e.pointerId)}catch(_){}
  T.act=h;T.drag={id:e.pointerId,h,off:hx[h]-x,x,cx:e.clientX,sx:x,li:snapOn()?handleLine(h):-1};holdTimer();drawTrim();showMag(e.clientX)});
$('cv').addEventListener('pointermove',e=>{const d=T.drag;if(!d||e.pointerId!==d.id)return;const w=$('cv').clientWidth,v=tView(),x=cvx(e);
  d.x=x;d.cx=e.clientX;const t=v.a+(x+d.off)/w*v.span;if(snapOn())snapHandle(d,t);else setHandle(d.h,t/tDur()*1000);
  if(Math.abs(x-d.sx)>4){d.sx=x;holdTimer()}updTrim();showMag(e.clientX)});
function endDrag(e){const d=T.drag;if(!d||e.pointerId!==d.id)return;clearTimeout(T.timer);T.drag=null;T.fine=null;hideMag();updTrim();repDragged()}
$('cv').addEventListener('pointerup',endDrag);$('cv').addEventListener('pointercancel',endDrag);
export function hearStop(){if(T.src){const s=T.src;T.src=null;try{s.onended=null;s.stop()}catch(e){}}T.play=null;$('hearcut').textContent='▶ hear the cut';drawTrim()}
$('hearcut').onclick=()=>{if(!raw)return;if(T.src){hearStop();return}stopPlay();
  const c=AC(),du=tDur(),sr=raw.sr,t=du*$(T.act==='s'?'ts':'te').value/1000,a=T.act==='s'?t:Math.max(0,t-1.5),b=T.act==='s'?Math.min(du,t+1.5):t;
  const i0=Math.floor(a*sr),n=Math.max(1,Math.floor(b*sr)-i0);
  const buf=c.createBuffer(1,n,sr),y=buf.getChannelData(0);
  y.set(raw.data.subarray(i0,i0+n));
  const s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);T.src=s;$('hearcut').textContent='■ stop';
  const st=c.currentTime+.02;s.start(st);s.onended=hearStop;
  const anim=()=>{if(T.src!==s)return;T.play=a+Math.max(0,c.currentTime-st);drawTrim();requestAnimationFrame(anim)};requestAnimationFrame(anim)};
