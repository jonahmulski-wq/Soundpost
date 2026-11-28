/* Effects: octave layer, repeat seams, low cut, echo, reverb, tame (compressor), volume, background sound. render() turns raw into the finished sound. */
import {ASSET_BASE,media} from './catalog.js';
import {raw} from './record.js';
import {RP,XF,repPlan} from './repeat/repeat.js';
import {$,AC,dB} from './util.js';

const bgBuf={};export let bgStatus='';
function pitch(d,r,sr){const W=Math.floor(sr*.09),H=W>>1,o=new Float32Array(d.length);
  for(let s=-H;s<d.length;s+=H){for(let i=0;i<W;i++){const oi=s+i;if(oi<0||oi>=d.length)continue;
    const p=s+i*r,i0=Math.floor(p);if(i0<0||i0+1>=d.length)continue;const f=p-i0;
    const w=.5-.5*Math.cos(2*Math.PI*i/W);o[oi]+=w*(d[i0]*(1-f)+d[i0+1]*f)}}
  return o}

function ir(c,secs,sr){const n=Math.floor(secs*sr),b=c.createBuffer(1,n,sr),x=b.getChannelData(0);
  for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);return b}

/* Background sound: load once, then loop it for the whole clip with a tiny fade-in and a fade-out at the end. */
async function bgData(k,N,sr){
  if(!bgBuf[k]){const r=await fetch(ASSET_BASE+media(k).file);if(!r.ok)throw new Error('HTTP '+r.status);bgBuf[k]=await AC().decodeAudioData(await r.arrayBuffer())}
  const T=N/sr,fi=Math.min(.06,T/4),fo=Math.min(1,T*.4),oc=new OfflineAudioContext(1,N,sr),s=oc.createBufferSource(),g=oc.createGain();
  s.buffer=bgBuf[k];s.loop=true;g.gain.setValueAtTime(0,0);g.gain.linearRampToValueAtTime(1,fi);g.gain.setValueAtTime(1,Math.max(fi,T-fo));g.gain.linearRampToValueAtTime(0,T);
  s.connect(g);g.connect(oc.destination);s.start();return(await oc.startRendering()).getChannelData(0)}
export async function render(){const n=raw.data.length,s0=Math.floor(n*$('ts').value/1000),rp=$('rep').checked?repPlan():{fix:'',ext:0,fade:0,gap:0};
  let d=raw.data.slice(s0,Math.min(n,Math.floor(n*$('te').value/1000)+Math.round(rp.ext*raw.sr))),off=s0;const sr=raw.sr;let s0s=0;for(let i=0;i<d.length;i++)s0s+=d[i]*d[i];const before=dB(Math.sqrt(s0s/Math.max(1,d.length)));
  if($('octon').checked){const sh=pitch(d,$('oct').value==='up'?2:.5,sr),m=+$('octmix').value/100,y=new Float32Array(d.length);
    for(let i=0;i<d.length;i++)y[i]=d[i]*(1-.35*m)+sh[i]*m;d=y}
  RP.plan=null;
  if($('rep').checked){const n=+$('reps').value,X=Math.min(Math.floor(sr*XF),Math.floor(d.length/4)),G=Math.round(rp.gap*sr),L=G?d.length+G:d.length-X,c=d.slice(),y=new Float32Array(L*(n-1)+c.length);
    for(let i=0;i<X;i++){const g=Math.sin(Math.PI/2*i/X);c[i]*=g;c[c.length-1-i]*=g}
    const F=Math.min(Math.round(rp.fade*sr),Math.floor(c.length/3));for(let i=0;i<F;i++)c[c.length-1-i]*=.5-.5*Math.cos(Math.PI*i/F);  // gentle fade-out (breathing room c)
    for(let k=0;k<n;k++)for(let i=0;i<c.length;i++)y[k*L+i]+=c[i];d=y;RP.plan={P:L/sr,len:c.length/sr,...rp}}
  const echo=$('echo').checked,rev=$('rev').checked,dl=+$('edelay').value/1000,fb=+$('efb').value/100,rs=+$('room').value;
  const tail=(echo?dl*7:0)+(rev?rs:0)+.1,oc=new OfflineAudioContext(1,Math.ceil(d.length+tail*sr),sr);
  const buf=oc.createBuffer(1,d.length,sr);buf.copyToChannel(d,0);
  const src=oc.createBufferSource();src.buffer=buf;let head=src;
  if($('lc').checked){const h1=oc.createBiquadFilter(),h2=oc.createBiquadFilter();h1.type=h2.type='highpass';h1.frequency.value=h2.frequency.value=70;h1.Q.value=.54;h2.Q.value=1.31;src.connect(h1);h1.connect(h2);head=h2}
  let node=head;
  if(echo){const mix=oc.createGain(),del=oc.createDelay(2),g=oc.createGain(),w=oc.createGain();
    del.delayTime.value=dl;g.gain.value=fb;w.gain.value=+$('emix').value/100;
    head.connect(mix);head.connect(del);del.connect(g);g.connect(del);del.connect(w);w.connect(mix);node=mix}
  const og=oc.createGain();node.connect(og);
  if(rev){const cv=oc.createConvolver(),w=oc.createGain();cv.buffer=ir(oc,rs,sr);w.gain.value=+$('revmix').value/100*1.2;node.connect(cv);cv.connect(w);w.connect(og)}
  let last=og;
  if($('comp').checked){const am=+$('camt').value/100,cp=oc.createDynamicsCompressor();cp.threshold.value=-10-am*30;cp.ratio.value=4+am*14;cp.attack.value=.003;cp.release.value=.15;cp.knee.value=10;og.connect(cp);last=cp}
  last.connect(oc.destination);
  const N=oc.length;
  src.start();
  const y=(await oc.startRendering()).getChannelData(0).slice();let pk=0;
  for(let i=0;i<y.length;i++)pk=Math.max(pk,Math.abs(y[i]));let ss=0;for(let i=0;i<y.length;i++)ss+=y[i]*y[i];const rms=Math.sqrt(ss/Math.max(1,y.length));
  if(pk>0){const gn=Math.min(.7/pk,.12/Math.max(rms,1e-6));for(let i=0;i<y.length;i++)y[i]*=gn}
  const vg=Math.pow(10,($('volon').checked?+$('vol').value:0)/20),sc=v=>Math.abs(v)<.8?v:Math.sign(v)*(.8+.2*Math.tanh((Math.abs(v)-.8)/.2));
  for(let i=0;i<y.length;i++)y[i]=sc(y[i]*vg);
  bgStatus='';
  if($('wat').checked){try{const w=await bgData($('wsel').value,y.length,sr);let vs=0,ws=0;for(let i=0;i<y.length;i++){vs+=y[i]*y[i];ws+=w[i]*w[i]}
      const gw=(+$('watmix').value/100)*.375*Math.max(Math.sqrt(vs/y.length),.01)/Math.max(Math.sqrt(ws/y.length),1e-6);let mp=0;
      for(let i=0;i<y.length;i++){y[i]+=w[i]*gw;mp=Math.max(mp,Math.abs(y[i]))}
      if(mp>.9){const k=.9/mp;for(let i=0;i<y.length;i++)y[i]*=k}
      bgStatus='OK'}catch(e){bgStatus='Failed: '+(e&&e.message||e)}}
  let s2=0,p2=0;for(let i=0;i<y.length;i++){s2+=y[i]*y[i];p2=Math.max(p2,Math.abs(y[i]))}
  return{data:y,sr,st:{before,after:dB(Math.sqrt(s2/Math.max(1,y.length))),peak:dB(p2)}}}

