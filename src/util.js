/* Small shared helpers: $ (find by id), messages, the audio context, number formats, test-page flag and version (TVER), IDs, saving files. */
export const $=id=>document.getElementById(id);
let ctx;
export const msg=t=>$('msg').textContent=t;
export const vm=t=>{const e=$('vmsg');e.hidden=false;e.textContent=t};
export function AC(){if(!ctx){try{ctx=new (window.AudioContext||window.webkitAudioContext)({sampleRate:44100})}catch(e){ctx=new (window.AudioContext||window.webkitAudioContext)()}}
  if(ctx.state==='suspended')ctx.resume();return ctx}
export const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
export const TEST=/\/test(\/|$)/.test(location.pathname)||location.protocol==='file:',TVER='V7.6';
export const r1=x=>Math.round(x*10)/10,r2=x=>Math.round(x*100)/100,yn=b=>b?'Yes':'No',kb=n=>Math.round(n/1024);
export const dB=x=>x>0?r1(20*Math.log10(x)):-99;
export function newId(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='SP-';const r=crypto.getRandomValues(new Uint8Array(4));r.forEach(v=>s+=a[v%a.length]);return s}
export function save(b,name){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
