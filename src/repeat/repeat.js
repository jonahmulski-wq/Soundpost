/* Smarter Repeat: "Repeat in time" (moves Start/End to whole beats), the breathing-room check at the seam, "Keep my exact trim", and what goes in the test log. */
import {raw} from '../record.js';
import {alignTo,findBeat,footPulse,noteStarts,trackBeats} from './beat.js';
import {tDur,updTrim} from '../trim.js';
import {$,r2,yn} from '../util.js';

/* Repeat the clip: the copies overlap by this many seconds and crossfade, so a rough trim doesn't pop. */
export const XF=.02;
/* ---- Smarter Repeat (test, Nov 26). Three parts:
   1. "Repeat in time with clip": find note starts (spectral flux), estimate the beat, then move Start to the nearest note (or beat)
      and End so each repeat is a whole number of beats. The 20 ms crossfade is added on top, so copies start exactly one phrase apart.
   2. Breathing-room check (Repeat on, no beat in use, exact trim off): quiet end = crossfade only; a note still ringing = borrow up to
      BR_MAX s past End if it dies away before a new note; otherwise fade the end and add a short pause.
   3. "Keep my exact trim": none of the above, just the 20 ms crossfade. ---- */
export const RP={lines:null,user:null,beat:null,why:'',beatMsg:'',note:'',plan:null,lv:null};
export const BR_MAX=1,BR_FADE=.25,BR_GAP=.35,BR_GAP_FX=.45,PRE=.035;  // borrow limit, fade-out, pause (longer with echo/reverb), lead-in before a note
export const setT=(id,t)=>$(id).value=Math.round(Math.max(0,Math.min(1,t/tDur()))*1e6)/1000;
function repSnap(){const du=tDur(),u=RP.user,us=du*u.ts/1000,ue=du*u.te/1000,a=Math.max(0,Math.min(us-2,du-40)),b=Math.min(du,a+40);  // look at up to 40 s around the trim: more notes make the beat estimate steadier
  const o=noteStarts(a,b),bt=findBeat(o);RP.beat=null;RP.lines=null;
  const fail=why=>{RP.why=why;RP.beatMsg=why==='Too short'?'This clip is too short to repeat in time. Using the breathing-room check instead.':'Couldn’t find a steady beat. Using the breathing-room check instead.';
    $('repbeat').checked=false;$('ts').value=u.ts;$('te').value=u.te;RP.user=null;RP.lines=null;updTrim();repShow();return false};
  if(!bt)return fail('No steady beat');
  const fp=footPulse(o,bt),p=fp.p,L=trackBeats(o,p,fp.ph,a,b),h=.15*p;
  if(L.length<2)return fail('No steady beat');
  RP.lines=L;
  // Start: the beat at or just before your Start (a hair after counts). End: the beat at or just after your End (a hair before counts).
  let si=-1;for(let i=0;i<L.length;i++)if(L[i].t-PRE<=us+h)si=i;if(si<0)si=0;
  let ei=-1;for(let i=si+1;i<L.length;i++)if(L[i].t-PRE>=ue-h){ei=i;break}
  if(ei<0)ei=L.length-1;
  while(ei>si&&L[ei].t-PRE+XF>du)ei--;
  if(ei<=si)return fail('Too short');
  const s0=L[si].t,e1=L[ei].t,k=ei-si,onNote=!L[si].est&&!L[ei].est,P=(onNote?alignTo(s0,e1):e1)-s0;
  const s=Math.max(0,s0-PRE);setT('ts',s);setT('te',Math.min(du,s+P+XF));
  RP.beat={bpm:60/(P/k),gridBpm:fp.gridBpm,k,P,onNote,fit:bt.frac,est:L.filter(x=>x.est).length/L.length};RP.why='';
  RP.beatMsg='In time: about '+Math.round(60/(P/k))+' beats per minute, '+k+' beat'+(k>1?'s':'')+' per repeat. Start and End moved to the nearest beats outside your trim. Uncheck to get your trim back.';
  updTrim();repShow();return true}
function repBeatOn(){if(!raw)return;if(!RP.user)RP.user={ts:+$('ts').value,te:+$('te').value};repSnap()}
function repBeatOff(){RP.lines=null;if(RP.user){$('ts').value=RP.user.ts;$('te').value=RP.user.te;RP.user=null;updTrim()}RP.beat=null;RP.beatMsg='';repShow()}
export function repDragged(){if(!$('repbeat').checked||!raw)return;RP.user={ts:+$('ts').value,te:+$('te').value};repSnap()}  // a hand-moved handle becomes the new trim to fit
export function repReset(){RP.user=null;RP.lines=null;RP.beat=null;RP.why='';RP.beatMsg='';RP.note='';RP.plan=null;RP.lv=null;$('repbeat').checked=false;repShow()}
export function repShow(){const keep=$('repkeep').checked,el=$('repmsg'),t=[RP.beatMsg,RP.note].filter(Boolean).join(' ');
  $('repbeat').disabled=keep;$('repbeat').parentNode.classList.toggle('off',keep);el.textContent=t;el.hidden=!t}
/* 10 ms loudness of the whole recording, plus the room-noise level and a loud level (for the breathing-room check) */
function repLevels(){if(RP.lv)return RP.lv;const d=raw.data,sr=raw.sr,b=Math.round(sr*.01),n=Math.floor(d.length/b),v=new Float32Array(n);
  for(let k=0;k<n;k++){let q=0;for(let i=k*b;i<k*b+b;i++)q+=d[i]*d[i];v[k]=Math.sqrt(q/b)}
  const s=Float32Array.from(v).sort(),pc=x=>s[Math.min(n-1,Math.floor(x*n))]||0,floor=pc(.1),loud=pc(.95);
  return RP.lv={v,b:.01,floor,loud,quiet:Math.max(floor*2.5,loud*.06,1e-4)}}
/* What Repeat should do at the seam. ext: seconds borrowed past End; fade/gap: seconds of fade-out and pause before the next copy. */
export function repPlan(){const keep=$('repkeep').checked;
  if(keep)return{fix:'Exact trim',ext:0,fade:0,gap:0};
  if($('repbeat').checked&&RP.beat)return{fix:'In time',ext:0,fade:0,gap:0};
  const L=repLevels(),du=tDur(),te=du*$('te').value/1000,ts=du*$('ts').value/1000,f=x=>Math.max(0,Math.min(L.v.length-1,Math.floor(x/L.b)));
  let end=0;for(let k=f(te-.04);k<=f(te-.001);k++)end=Math.max(end,L.v[k]);
  if(end<=L.quiet||te-ts<.3)return{fix:'Crossfade',ext:0,fade:0,gap:0};
  let lo=end;for(let k=f(te);k<L.v.length&&(k*L.b-te)<BR_MAX;k++){const v=L.v[k];
    if(v<=L.quiet&&L.v[k+1]<=L.quiet&&L.v[k+2]<=L.quiet){const ext=Math.min(BR_MAX,k*L.b-te+XF);return{fix:'Borrowed',ext,fade:0,gap:0}}  // quiet for 30 ms, not just a gap between legato notes
    if(v>lo*2&&v>L.quiet*2)break;lo=Math.min(lo,v)}                  // a new note starts: don't borrow into it
  return{fix:'Fade + pause',ext:0,fade:Math.min(BR_FADE,(te-ts)/3),gap:$('echo').checked||$('rev').checked?BR_GAP_FX:BR_GAP}}
export function repNote(){const p=RP.plan;RP.note='';if(p&&!$('repkeep').checked){
  if(p.fix==='Borrowed')RP.note='The last note rings '+p.ext.toFixed(2)+' s past your End so it isn’t cut off.';
  else if(p.fix==='Fade + pause')RP.note='The last note was still sounding, so it fades out with a short pause before each repeat.'}repShow()}
export function repLog(){if(!$('rep').checked)return{};const p=RP.plan||{},b=RP.beat,u=RP.user,du=raw?tDur():0;
  return{'Repeat Keep Trim':yn($('repkeep').checked),'Repeat In Time':$('repbeat').checked&&b?'Yes':RP.why||'No','Repeat BPM':b?Math.round(b.bpm*10)/10:'','Repeat Beat Scores':$('repbeat').checked||RP.why?RP.sc||'':'','Repeat Grid BPM':b?Math.round(b.gridBpm*10)/10:'','Repeat Guessed Lines':b?Math.round(b.est*100)+'%':'','Repeat Beats':b?b.k:'',
    'Repeat Beat Fit':b?Math.round(b.fit*100)+'%':'','Repeat End On Note':b?yn(b.onNote):'','Repeat Your Trim s':u?r2(du*u.ts/1000)+'-'+r2(du*u.te/1000):'',
    'Repeat Fix':p.fix||'','Repeat Borrow s':p.ext?r2(p.ext):'','Repeat Pause s':p.gap?r2(p.gap):'','Repeat Period s':p.P?Math.round(p.P*1000)/1000:''}}
$('repbeat').addEventListener('change',()=>{if($('repbeat').checked)repBeatOn();else{RP.why='';repBeatOff()}});
$('repkeep').addEventListener('change',()=>{if($('repkeep').checked&&$('repbeat').checked){$('repbeat').checked=false;repBeatOff()}RP.note='';repShow()});
$('rep').addEventListener('change',()=>{if(!$('rep').checked&&$('repbeat').checked){$('repbeat').checked=false;repBeatOff()}});
