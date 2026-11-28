/* Video pictures: the four drawn scenes, the picture picker, uploading your own photo. */
import {mediaOf} from './catalog.js';
import {vblob,vext,vinfo} from './export/video.js';
import {$,TEST,kb,vm} from './util.js';

function rnd(s){return()=>(s=s*16807%2147483647)/2147483647}
function sky(g,w,h,st){const l=g.createLinearGradient(0,0,0,h);st.forEach(([p,c])=>l.addColorStop(p,c));g.fillStyle=l;g.fillRect(0,0,w,h)}
function ridge(g,w,h,y,a,col,sd){g.fillStyle=col;g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=Math.max(2,w/180)){const t=x/w*6.283;g.lineTo(x,h*y+h*a*(Math.sin(t*1.3+sd)*.6+Math.sin(t*3.1+sd*2)*.3+Math.sin(t*7+sd*3)*.1))}g.lineTo(w,h);g.closePath();g.fill()}
function pines(g,w,h,base,th,col,sd){const r=rnd(sd);g.fillStyle=col;for(let x=-10;x<w+10;x+=w*(.025+r()*.03)){const t=h*th*(.7+r()*.6),tw=t*.22;g.beginPath();g.moveTo(x,h*base-t);g.lineTo(x+tw,h*base);g.lineTo(x-tw,h*base);g.fill()}g.fillRect(0,h*base,w,h)}
function glow(g,x,y,r,c){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+c+',.8)');q.addColorStop(1,'rgba('+c+',0)');g.fillStyle=q;g.fillRect(0,0,g.canvas.width,g.canvas.height)}
function scene(g,w,h,k){
  if(k==='desert'){sky(g,w,h,[[0,'#2b1b4d'],[.45,'#a23b5a'],[.7,'#f08a4b'],[1,'#ffd27a']]);
    glow(g,w*.5,h*.6,w*.45,'255,230,160');g.fillStyle='#ffe9a8';g.beginPath();g.arc(w*.5,h*.6,w*.1,0,6.283);g.fill();
    [[.18,.14,.66],[.7,.18,.62],[.45,.08,.7]].forEach(([cx,hw,top])=>{g.fillStyle='#6b2f4f';g.beginPath();g.moveTo(w*(cx-hw),h*.8);g.lineTo(w*(cx-hw*.8),h*top);g.lineTo(w*(cx+hw*.8),h*top);g.lineTo(w*(cx+hw),h*.8);g.fill()});
    ridge(g,w,h,.82,.02,'#3a1a33',2);ridge(g,w,h,.92,.015,'#1c0e1f',4)}
  else if(k==='forest'){sky(g,w,h,[[0,'#c9ddd3'],[1,'#f1efe3']]);
    [['#a7c0b0',.6,.2,1],['#7a9f8e',.7,.24,2],['#4c7466',.8,.28,3],['#244a3e',.92,.34,4]].forEach(([c,b,t,sd])=>{pines(g,w,h,b,t,c,sd);const f=g.createLinearGradient(0,h*(b-.2),0,h*b);f.addColorStop(0,'rgba(241,239,227,0)');f.addColorStop(1,'rgba(241,239,227,.35)');g.fillStyle=f;g.fillRect(0,h*(b-.2),w,h*.2)})}
  else if(k==='night'){sky(g,w,h,[[0,'#070b1f'],[.65,'#1a2a5e'],[1,'#3d5190']]);const r=rnd(7);
    for(let i=0;i<170;i++){g.fillStyle='rgba(255,255,240,'+(.3+r()*.7)+')';g.beginPath();g.arc(r()*w,r()*h*.7,(.4+r()*1.2)*w/720+.3,0,6.283);g.fill()}
    glow(g,w*.72,h*.22,w*.2,'246,241,209');g.fillStyle='#f6f1d1';g.beginPath();g.arc(w*.72,h*.22,w*.05,0,6.283);g.fill();
    ridge(g,w,h,.72,.06,'#0e1636',3);ridge(g,w,h,.84,.04,'#060a1c',5)}
  else{sky(g,w,h,[[0,'#4d6fa8'],[.45,'#f0a7a0'],[.62,'#ffdca3'],[.6201,'#2f4f82'],[1,'#0f2240']]);
    g.fillStyle='#fff0c4';g.beginPath();g.arc(w*.5,h*.62,w*.09,Math.PI,0);g.fill();
    for(let i=0;i<28;i++){const ww=w*.2*(1-i/34)*(.7+.3*Math.sin(i*1.7));g.fillStyle='rgba(255,226,170,'+(.55*(1-i/28))+')';g.fillRect(w*.5-ww/2,h*.62+i*h*.012,ww,h*.006)}}}
export let pic={kind:'desert',img:null};
const vchg=()=>{if(vblob)vm('Settings changed. Tap Make Video to update your video.')};
export const vname=()=>'Soundpost'+(pic.name?' '+pic.name:'')+(TEST&&vinfo?' '+vinfo.ID:'')+'.'+vext;
export function paint(g,w,h){if(pic.img){const im=pic.img,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,sc=Math.max(w/iw,h/ih);g.fillStyle='#000';g.fillRect(0,0,w,h);g.drawImage(im,(w-iw*sc)/2,(h-ih*sc)/2,iw*sc,ih*sc)}else scene(g,w,h,pic.kind)}
mediaOf('picture').forEach(({scene:k,name:n},i)=>{
  const b=document.createElement('button'),c=document.createElement('canvas');b.type='button';b.title=n;b.setAttribute('aria-label',n);c.width=c.height=96;scene(c.getContext('2d'),96,96,k);b.appendChild(c);
  b.onclick=()=>{pic={kind:k,img:null};vchg();[...$('pics').children].forEach(x=>x.classList.toggle('sel',x===b))};if(i===0)b.classList.add('sel');$('pics').appendChild(b)});
$('pimg').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.onload=()=>{pic={kind:'own',img:im,name:f.name.replace(/\.[^.]+$/,'').trim(),px:im.naturalWidth+'x'+im.naturalHeight,kb:kb(f.size)};[...$('pics').children].forEach(x=>x.classList.remove('sel'));vm(vblob?'Your photo is selected. Tap Make Video to update your video.':'Your photo is selected.')};im.src=URL.createObjectURL(f)};
['vshape','vmotion'].forEach(id=>$(id).addEventListener('change',vchg));
