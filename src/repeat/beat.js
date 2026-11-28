/* Beat finding for Repeat: note starts (spectral flux), steady-beat check, foot-tap tempo, and beat lines that follow the player. */
import {raw} from '../record.js';
import {RP} from './repeat.js';

function fftR(re,im){const n=re.length;
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let len=2;len<=n;len<<=1){const h=len>>1,a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<h;k++){const p=i+k,q=p+h,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;
      re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
/* Note starts between a and b seconds: returns {t:[times], w:[strengths], env, hop, t0}. Flux on log spectrum, so pitch changes count, not just loudness. */
export function noteStarts(a,b){const d=raw.data,sr=raw.sr,N=1024,i0=Math.max(0,Math.floor(a*sr)),i1=Math.min(d.length,Math.floor(b*sr)),
    hop=Math.max(Math.round(sr*.005),Math.ceil((i1-i0)/8000)),F=Math.max(0,Math.floor((i1-i0-N)/hop)+1),nb=Math.min(N/2,Math.floor(8000/sr*N)),
    win=new Float32Array(N),re=new Float32Array(N),im=new Float32Array(N),prev=new Float32Array(nb),env=new Float32Array(F),hs=hop/sr,t0=(i0+N/2)/sr;
  for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  for(let f=0;f<F;f++){const s=i0+f*hop;for(let i=0;i<N;i++){re[i]=d[s+i]*win[i];im[i]=0}fftR(re,im);let fl=0;
    for(let k=1;k<nb;k++){const m=Math.log(1+400*Math.hypot(re[k],im[k])/N);if(f&&m>prev[k])fl+=m-prev[k];prev[k]=m}env[f]=fl}
  const W=Math.round(.25/hs),P=new Float64Array(F+1);for(let f=0;f<F;f++)P[f+1]=P[f]+env[f];
  let mx=0;for(let f=0;f<F;f++)mx=Math.max(mx,env[f]);const gm=P[F]/Math.max(1,F),R=Math.max(1,Math.round(.04/hs)),t=[],w=[];
  for(let f=1;f<F-1;f++){const v=env[f];if(v<.08*mx)continue;const lo=Math.max(0,f-W),hi=Math.min(F,f+W+1),lm=(P[hi]-P[lo])/(hi-lo);
    if(v<lm*1.4+gm*.3)continue;let pk=true;for(let j=Math.max(0,f-R);j<=Math.min(F-1,f+R);j++)if(env[j]>v||(env[j]===v&&j<f)){pk=false;break}
    if(!pk)continue;const tt=t0+f*hs;if(t.length&&tt-t[t.length-1]<.08){if(v>w[w.length-1]){t[t.length-1]=tt;w[w.length-1]=v}continue}t.push(tt);w.push(v)}
  return{t,w,env,hs,t0}}
/* How well the note starts sit on a grid of period p (refined ±3%): {p,ph,frac,hits} */
function gridFit(o,p0){let best=null;
  for(let j=-60;j<=60;j++){const p=p0*(1+j/1000),tol=Math.max(.035,.1*p);let C=0,S=0;
    for(let i=0;i<o.t.length;i++){const a=2*Math.PI*o.t[i]/p;C+=o.w[i]*Math.cos(a);S+=o.w[i]*Math.sin(a)}
    const ph=Math.atan2(S,C)/(2*Math.PI)*p;let h=0;for(const x of o.t){let r=((x-ph)%p+p)%p;if(r>p/2)r-=p;if(Math.abs(r)<=tol)h++}
    let wh=0,wt=0;for(let i=0;i<o.t.length;i++){let r=((o.t[i]-ph)%p+p)%p;if(r>p/2)r-=p;wt+=o.w[i];if(Math.abs(r)<=tol)wh+=o.w[i]}
    const sc=h+Math.hypot(C,S)/1e3;if(!best||sc>best.sc)best={p,ph,hits:h,frac:h/o.t.length,wf:wh/(wt||1),chance:Math.min(1,2*tol/p),sc}}
  return best}
/* Drift-tolerant beat check: among notes stronger than the median, how often is the gap to the next one a whole number of beats (p refined ±6%)? */
function ioiZ(o,p0){const ws=[...o.w].sort((a,b)=>a-b),thr=ws[Math.floor(ws.length/2)]||0,t=o.t.filter((x,i)=>o.w[i]>=thr);let best={z:-9,p:p0};
  for(let j=-60;j<=60;j+=2){const p=p0*(1+j/1000),tol=Math.max(.035,.1*p),c=Math.min(.99,2*tol/p);let h=0,n=0;
    for(let i=0;i+1<t.length;i++){const d=t[i+1]-t[i];if(d>2.5)continue;n++;if(Math.abs(d-Math.max(1,Math.round(d/p))*p)<=tol)h++}
    const z=n?(h-n*c)/Math.sqrt(n*c*(1-c)):-9;if(z>best.z)best={z,p,h,n}}
  return best}
/* Steady beat or null. Autocorrelation of the note-start curve, with a gentle preference for 70-150 BPM; then checks half and double tempo. */
export function findBeat(o){RP.sc=o.t.length+' notes';if(o.t.length<4)return null;const e=o.env,F=e.length,hs=o.hs,L0=Math.round(.3/hs),L1=Math.min(Math.round(1.5/hs),Math.floor(F/2));if(L1<=L0)return null;
  let m=0;for(let i=0;i<F;i++)m+=e[i];m/=F;const z=Float32Array.from(e,v=>v-m);let r0=0;for(let i=0;i<F;i++)r0+=z[i]*z[i];r0/=F;if(!(r0>0))return null;
  const ac=new Float32Array(L1+2);for(let L=L0-1;L<=L1+1;L++){let s=0;for(let i=0;i+L<F;i++)s+=z[i]*z[i+L];ac[L]=s/(F-L)}
  let bL=0,bs=-1;for(let L=L0;L<=L1;L++){if(ac[L]<ac[L-1]||ac[L]<ac[L+1])continue;const bpm=60/(L*hs),s=ac[L]*Math.exp(-.5*Math.pow(Math.log2(bpm/105)/1.1,2));if(s>bs){bs=s;bL=L}}
  if(!bL||ac[bL]/r0<.1)return null;
  const y0=ac[bL-1],y1=ac[bL],y2=ac[bL+1],dd=y0-2*y1+y2,p=(bL+(dd?.5*(y0-y2)/dd:0))*hs;
  // try related tempos (half, third, double, triple): among those that fit the notes nearly as well as the best, take the one closest to 105 BPM
  const fits=[1,1/2,1/3,2,3].map(m=>p*m).filter(x=>x>=.2&&x<=1.5).map(x=>gridFit(o,x)),top=Math.max(...fits.map(x=>x.frac));
  const good=fits.filter(x=>x.frac>=top-.1),g=good.filter(x=>!good.some(y=>y.p>x.p*1.4&&y.frac>=x.frac-.05)).sort((x,y)=>Math.abs(Math.log2(60/x.p/105))-Math.abs(Math.log2(60/y.p/105)))[0],ok=x=>x&&x.p>=.2&&x.p<=1.5;  // fast grids (up to 300) are fine here: footPulse halves them later

  // real playing has extra and ornament notes, so don't demand a high share on the grid; ask instead that it beats chance by a wide margin
  const n=o.t.length,zs=(g.hits-n*g.chance)/Math.sqrt(n*g.chance*(1-g.chance));
  // second check that tolerates slow tempo drift in live playing: gaps between neighbouring strong notes should be whole beats
  const zi=[g.p,g.p/2].filter(x=>x>=.15).map(x=>ioiZ(o,x)).reduce((a,b)=>b.z>a.z?b:a);  // half-beat notes count as on the beat too
  // third check: only the strong notes (40%+ of the loudest start), e.g. the main "boom"s with softer in-between sounds left out
  const mx=Math.max(...o.w),so={t:o.t.filter((x,i)=>o.w[i]>=.4*mx),w:o.w.filter(x=>x>=.4*mx)},zst=so.t.length>=10?Math.max(...[g.p,g.p/2].filter(x=>x>=.15).map(x=>{const f=gridFit(so,x);return(f.hits-so.t.length*f.chance)/Math.sqrt(so.t.length*f.chance*(1-f.chance))})):-9;
  RP.sc=[n,Math.round(60/g.p),zs,zi.z,zst].map(x=>Math.round(x*10)/10).join(' / ');  // notes / grid BPM / grid, note-gap and strong-note scores (pass: 4.5, 4, 4.5)
  if(!ok(g)||n<12||!((zs>=4.5&&g.hits>=8&&g.frac>=.35)||zi.z>=4||zst>=4.5))return null;
  const span=o.t[o.t.length-1]-o.t[0];if(span<3*g.p)return null;
  return{p:g.p,ph:g.ph,frac:g.frac,bpm:60/g.p,z:zs,zi:zi.z,zst}}
/* 1 ms loudness curve around t, used to line up two note starts exactly */
function lv1(t0,n){const d=raw.data,sr=raw.sr,b=Math.max(1,Math.round(sr/1000)),o=new Float32Array(n);
  for(let k=0;k<n;k++){const s=Math.floor(t0*sr)+k*b;let q=0;for(let i=s;i<s+b;i++){const v=i>=0&&i<d.length?d[i]:0;q+=v*v}o[k]=Math.sqrt(q/b)}return o}
export function alignTo(t1,t2){const A=lv1(t1-.03,150);let best=0,bc=-Infinity;
  for(let s=-25;s<=25;s++){const B=lv1(t2+s/1000-.03,150);let c=0,na=0,nb=0;for(let i=0;i<150;i++){c+=A[i]*B[i];na+=A[i]*A[i];nb+=B[i]*B[i]}c/=Math.sqrt(na*nb)||1;if(c>bc){bc=c;best=s}}
  return t2+best/1000}
/* Foot-tap pulse: people feel the slower beat, so halve the found tempo until it is 120 BPM or less (never below 40).
   Which of the faster beats is the main one: the one with the stronger notes on it. */
export function footPulse(o,bt){let p=bt.p,ph=bt.ph;
  while(60/p>120&&60/(2*p)>=40){const tol=Math.max(.035,.1*p);let w0=0,w1=0;
    for(let i=0;i<o.t.length;i++){let r=((o.t[i]-ph)%(2*p)+2*p)%(2*p);if(Math.min(r,2*p-r)<=tol)w0+=o.w[i];else if(Math.abs(r-p)<=tol)w1+=o.w[i]}
    if(w1>w0)ph+=p;p*=2}
  return{p,ph,bpm:60/p,gridBpm:bt.bpm}}
/* Beat lines that follow the player: step one beat at a time; when a note starts near the expected beat, put the line on it
   and let the spacing drift slowly with the playing (within ±12%). With no note there, the line is a guess (est). */
export function trackBeats(o,p,ph,a,b){const T=o.t,W=o.w,tol=Math.max(.04,.12*p),mx=Math.max(...W),pick=t=>{let x=-1,bs=0;
    for(let i=0;i<T.length;i++){const d=Math.abs(T[i]-t);if(d>tol)continue;const sc=W[i]/mx*(1-d/tol*.6);if(sc>bs&&W[i]>=mx*.08){bs=sc;x=i}}return x};
  let t0=null;for(let g=ph+Math.ceil((a-ph)/p)*p;g<b&&t0===null;g+=p){const i=pick(g);if(i>=0)t0=T[i]}
  if(t0===null)return[];const out=[{t:t0,est:false}];
  for(const dir of[1,-1]){let t=t0,q=p;for(;;){const g=t+dir*q;if(g<a-.01||g>b+.01)break;const i=pick(g),n=i>=0?T[i]:g;
    if(i>=0)q=Math.max(p*.88,Math.min(p*1.12,.75*q+.25*Math.abs(n-t)));(dir>0?out.push.bind(out):out.unshift.bind(out))({t:n,est:i<0});t=n}}
  return out}
