import {canUse} from './features.js';

/* Media catalog: every sound, picture and pack the app offers, with its tier and where to get it.
   tier: 'free', 'subscriber' or 'pack:<name>'. Sounds are fetched from ASSET_BASE + file; built-in pictures are drawn by code (scene).
   ASSET_BASE is '' because the sounds ship inside the app (public/sounds/). A media server later must allow CORS. */
export const ASSET_BASE='';
export const MEDIA=[
  {id:'brook',type:'sound',name:'Flowing Brook',file:'sounds/water.mp3',tier:'free'},  // from a WhatsApp recording; swap in the original if sent
  {id:'desert',type:'picture',name:'Desert sunset',scene:'desert',tier:'free'},
  {id:'forest',type:'picture',name:'Misty forest',scene:'forest',tier:'free'},
  {id:'night',type:'picture',name:'Starry night',scene:'night',tier:'free'},
  {id:'ocean',type:'picture',name:'Ocean dawn',scene:'ocean',tier:'free'},
];
export const media=id=>MEDIA.find(m=>m.id===id);
export const mediaOf=type=>MEDIA.filter(m=>m.type===type&&canUse(m));
