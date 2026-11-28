/* Test log (test page only): phone details, a snapshot of every setting, and one row per Share or Download sent to the Google Sheet. */
import {bgStatus} from './effects.js';
import {raw,srcInfo} from './record.js';
import {XF,repLog} from './repeat/repeat.js';
import {$,TEST,TVER,kb,r2,yn} from './util.js';


/* ---- Test log (only runs on the /test/ page) ---- */
const LOG_URL='https://script.google.com/macros/s/AKfycby1xBc16mJsY6GnpyNccJCt5RWd7ZnjsNqHxwKO7KsaIu9qmBNrULClPuMBLRKMvJeC-w/exec',LOG_KEY='sp-7Qx2';  // LOG_URL: the Apps Script web app address, once deployed
let dev={};
async function devInfo(){const n=navigator,ua=n.userAgent;let phone='',browser='';
  try{if(n.userAgentData){const h=await n.userAgentData.getHighEntropyValues(['model','platformVersion','fullVersionList']);
    phone=[h.model,n.userAgentData.platform,h.platformVersion].filter(Boolean).join(' ');
    const b=(h.fullVersionList||[]).find(x=>!/Not|Chromium/i.test(x.brand))||(h.fullVersionList||[])[0];if(b)browser=b.brand+' '+b.version}}catch(e){}
  if(!phone){const m=ua.match(/\(([^)]+)\)/);phone=m?m[1]:''}
  if(!browser){const m=ua.match(/(CriOS|FxiOS|EdgA?|SamsungBrowser|Firefox|Chrome|Version)\/([\d.]+)/);browser=m?(m[1]==='Version'?'Safari':m[1])+' '+m[2]:ua.slice(0,60)}
  dev={'Phone':phone,'Browser':browser,'Screen':screen.width+'x'+screen.height+' @'+(devicePixelRatio||1)+'x','Memory GB':n.deviceMemory||'','CPU Cores':n.hardwareConcurrency||''}}
export function snapAudio(st){const ts=+$('ts').value,te=+$('te').value,du=raw.data.length/raw.sr,ch=id=>$(id).checked,v=id=>+$(id).value,tx=id=>$(id).selectedOptions[0].text;
  return{'Sound Source':srcInfo.src,'Mic Auto Gain':srcInfo.agc||'','Mic Noise Suppression':srcInfo.ns||'','Mic Echo Cancel':srcInfo.ec||'','Mic Name':srcInfo.mic||'','Source File Type':srcInfo.type,'Source File KB':srcInfo.kb,'Raw Length s':r2(du),'Kept Length s':r2(du*(te-ts)/1000),'Trimmed':yn(ts>0||te<1000),
    'Clipping':yn(raw.clip>20),'Clip Count':raw.clip,'Loudness Before dB':st.before,'Loudness After dB':st.after,'Peak dB':st.peak,
    'Low Cut':yn(ch('lc')),'Tame Amount':ch('comp')?v('camt'):'Off','Volume dB':ch('volon')?v('vol'):'Off',
    'Echo':yn(ch('echo')),'Echo Delay':ch('echo')?v('edelay'):'','Echo Repeats':ch('echo')?v('efb'):'','Echo Amount':ch('echo')?v('emix'):'',
    'Reverb':yn(ch('rev')),'Reverb Type':ch('rev')?tx('room'):'','Reverb Amount':ch('rev')?v('revmix'):'',
    'Repeat':yn(ch('rep')),'Repeat Times':ch('rep')?v('reps'):'','Repeat Crossfade ms':ch('rep')?XF*1000:'',...repLog(),'Octave':yn(ch('octon')),'Octave Dir':ch('octon')?($('oct').value==='up'?'Higher':'Lower'):'','Octave Amount':ch('octon')?v('octmix'):'',
    'Water':yn(ch('wat')),'Water Sound':ch('wat')?tx('wsel'):'','Water Volume':ch('wat')?v('watmix'):'','Water Load':ch('wat')?bgStatus:''}}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0'),o=-d.getTimezoneOffset()/60;
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+' (UTC'+(o>=0?'+':'')+o+')'}
export function logIt(action,type,info,b){if(!TEST||!info)return;
  const row={'ID':info.ID,'Date/Time':stamp(),'Test Version':TVER,'Action':action,'Type':type,'Tester':$('tname').value.trim(),...dev,...info,'Output KB':b?kb(b.size):''};
  $('tinfo2').textContent=Object.entries(row).filter(([k,v])=>v!==''&&v!==undefined).map(([k,v])=>k+': '+v).join('\n');$('tcopy').disabled=false;
  if(!LOG_URL){$('tstat').textContent=info.ID+': the test log isn’t connected yet, so this was not sent. Use Copy test info.';return}
  try{fetch(LOG_URL,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({_key:LOG_KEY,...row})})
    .then(()=>$('tstat').textContent=info.ID+': sent to the test log.').catch(()=>$('tstat').textContent=info.ID+': couldn’t send (no internet?). Use Copy test info.')}
  catch(e){$('tstat').textContent=info.ID+': couldn’t send. Use Copy test info.'}}
if(TEST){$('tbar').hidden=false;$('tbox').hidden=false;$('tver').textContent=TVER;
  try{$('tname').value=localStorage.getItem('spTester')||''}catch(e){}
  $('tname').addEventListener('change',()=>{try{localStorage.setItem('spTester',$('tname').value.trim())}catch(e){}});
  $('tcopy').onclick=async()=>{const t=$('tinfo2').textContent;try{await navigator.clipboard.writeText(t);$('tcopy').textContent='Copied'}catch(e){const r=document.createRange();r.selectNodeContents($('tinfo2'));const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');$('tcopy').textContent='Copied'}
    setTimeout(()=>$('tcopy').textContent='Copy test info',1500)};
  devInfo()}
