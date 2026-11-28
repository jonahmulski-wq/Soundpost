/* Recording and loading: microphone recording with the live waveform, choosing a file, decoding into raw, and the "Replace existing recording?" box (askReplace). */
import {setPrev,stopPlay} from './preview.js';
import {repReset} from './repeat/repeat.js';
import {trimReset,updTrim} from './trim.js';
import {$,AC,fmt,kb,msg} from './util.js';

export let live=null,raw=null,rec=null,stream=null,chunks=[],tick=null,t0=0;
export let srcInfo={src:'',type:'',kb:''},micInfo={};

function drawLive(pk){const c=$('cv'),k=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;if(c.width!==w*k){c.width=w*k;c.height=h*k}
  const g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,w,h);
  const cs=getComputedStyle(document.documentElement),ok=cs.getPropertyValue('--acc'),hot=cs.getPropertyValue('--rec');
  const n=pk.length,step=3,cols=Math.ceil(w/step)+1;
  for(let i=Math.max(0,n-cols);i<n;i++){const m=pk[i],x=w-(n-i)*step;
    g.fillStyle=m>.95?hot:ok;const bh=Math.max(1,Math.min(1,m)*h*.95);g.fillRect(x,(h-bh)/2,2,bh)}}

async function load(ab){try{const b=await AC().decodeAudioData(ab);const n=b.length,d=new Float32Array(n);
  for(let c=0;c<b.numberOfChannels;c++){const ch=b.getChannelData(c);for(let i=0;i<n;i++)d[i]+=ch[i]/b.numberOfChannels}
  raw={data:d,sr:b.sampleRate};repReset();$('ts').value=0;$('te').value=1000;$('trimbox').hidden=false;trimReset();updTrim();setPrev(false);$('share').disabled=false;$('dl').disabled=false;let cl=0;for(let i=0;i<n;i++)if(Math.abs(d[i])>.95)cl++;raw.clip=cl;
  msg(cl>20?'Heads up: this recording distorted in a few places because it was too loud for the microphone. Holding the phone farther from the instrument helps. Select “Tame harsh notes” below to soften it, but not fully repair it.':'Trim the ends above, choose effects below, then tap Preview.')}
  catch(e){msg('That audio couldn’t be read ('+(e.message||e.name||'unknown error')+'). Try another file.')}}

async function startRec(){AC();
  if(!navigator.mediaDevices||!window.MediaRecorder){msg('Recording isn’t supported in this view. Use “choose an audio file” instead.');return}
  msg('Asking for microphone access…');
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}
  catch(e){msg('Microphone unavailable ('+(e.name||'error')+'). Allow mic access, or use “choose an audio file”.');return}
  try{const tr=stream.getAudioTracks()[0],st=tr.getSettings?tr.getSettings():{},oo=v=>v===undefined?'Unknown':v?'On':'Off';
    micInfo={agc:oo(st.autoGainControl),ns:oo(st.noiseSuppression),ec:oo(st.echoCancellation),mic:(tr.label||'').slice(0,60)}}catch(e){micInfo={}}
  try{const c=AC(),sn=c.createMediaStreamSource(stream),an=c.createAnalyser();an.fftSize=2048;sn.connect(an);
    const buf=new Float32Array(an.fftSize),pk=[];let acc=0,last=performance.now();live={sn};$('cv').classList.remove('trim');
    const loop=()=>{if(!live)return;an.getFloatTimeDomainData(buf);for(let i=0;i<buf.length;i++){const a=Math.abs(buf[i]);if(a>acc)acc=a}
      const now=performance.now();if(now-last>=40){pk.push(acc);acc=0;last=now;if(pk.length>2000)pk.splice(0,1000);drawLive(pk)}requestAnimationFrame(loop)};requestAnimationFrame(loop)}catch(e){live=null}
  chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  rec.onstop=async()=>{clearInterval(tick);if(live){try{live.sn.disconnect()}catch(e){}live=null}stream.getTracks().forEach(t=>t.stop());$('rec').classList.remove('on');$('rec').textContent='Rec';
    const rb=new Blob(chunks,{type:rec.mimeType});srcInfo={src:'Recorded',type:(rec.mimeType||'').split(';')[0],kb:kb(rb.size),...micInfo};await load(await rb.arrayBuffer())};
  rec.start();t0=Date.now();$('rec').classList.add('on');$('rec').textContent='Stop';msg('Recording… tap Stop when done (up to 2 minutes).');
  tick=setInterval(()=>{const s=(Date.now()-t0)/1000;$('tm').textContent=fmt(s);if(s>=120)rec.stop()},200)}
let rplSkip=false;
function askReplace(){if(rplSkip)return Promise.resolve(true);return new Promise(r=>{const m=$('rpl'),ok=$('rplY'),no=$('rplN'),cb=$('rplK'),done=v=>{m.hidden=true;ok.onclick=no.onclick=null;if(v&&cb.checked)rplSkip=true;cb.checked=false;r(v)};m.hidden=false;ok.onclick=()=>done(true);no.onclick=()=>done(false);no.focus()})}
$('rec').onclick=async()=>{stopPlay();if(rec&&rec.state==='recording'){rec.stop();return}
  if(raw&&!await askReplace())return;startRec()};
$('file').onchange=async e=>{const f=e.target.files[0];if(f){msg('Reading '+f.name+'…');AC();srcInfo={src:'Uploaded file',type:f.type||f.name.split('.').pop(),kb:kb(f.size)};await load(await f.arrayBuffer())}};



