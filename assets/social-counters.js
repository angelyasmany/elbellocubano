(()=>{'use strict';
 const format=new Intl.NumberFormat('es-PE'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ttl=86400000;
 const sources=[
  {name:'TikTok',id:'tt-followers',url:'/api/followers',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano'},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano'},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ].map(s=>({...s,node:document.getElementById(s.id),link:document.querySelector('[data-social="'+s.name+'"]'),value:null,busy:false,frame:0,updated:null,checked:null})).filter(s=>s.node&&!(s.name==='Instagram'&&s.node.hidden));
 const reach=document.getElementById('reach'),totalNode=document.getElementById('reach-total');
 function animate(s,value){cancelAnimationFrame(s.frame);if(reduced.matches||document.hidden){s.node.textContent=format.format(value);return;}const from=s.value??0,start=performance.now();function tick(time){const t=Math.min(1,(time-start)/650);s.node.textContent=format.format(Math.round(from+(value-from)*(1-(1-t)**3)));if(t<1)s.frame=requestAnimationFrame(tick);}s.frame=requestAnimationFrame(tick);}
 function total(){if(!totalNode)return;const known=sources.filter(s=>s.value!==null);if(!known.length){totalNode.textContent='—';reach.dataset.state='waiting';return;}const n=known.reduce((sum,s)=>sum+s.value,0);if(!Number.isSafeInteger(n))return;totalNode.textContent=format.format(n);reach.dataset.state=known.length===sources.length?'ready':'partial';reach.title='Suma de '+known.map(s=>s.name).join(', ')+'. '+(known.length<sources.length?'Total parcial: faltan redes sin lectura numérica. ':'')+'Las audiencias pueden repetirse; no son visitas garantizadas.';}
 function key(s){return 'ebc-count-v1:'+s.name+':'+s.account;}
 function save(s){try{localStorage.setItem(key(s),JSON.stringify({count:s.value,updated:s.updated,checked:s.checked}))}catch{}}
 function restore(s){try{const data=JSON.parse(localStorage.getItem(key(s)));if(!data||!Number.isSafeInteger(data.count)||data.count<0||!Number.isFinite(data.checked)||Date.now()-data.checked>ttl||data.checked>Date.now()+60000)return;s.value=data.count;s.updated=data.updated;s.checked=data.checked;s.node.textContent=format.format(data.count);s.node.dataset.state='stale';s.node.title='Último dato verificado guardado; comprobando actualización';}catch{}}
 function facebookVisual(show){const node=document.querySelector('.facebook-counter');const count=document.getElementById('fb-followers');if(!node||!count)return;node.hidden=!show;count.hidden=show;if(show&&!node.querySelector('iframe')){const frame=document.createElement('iframe');frame.src='https://livecounts.nl/facebook-realtime/embed/?u=elbellocubano';frame.title='elbellocubano live Facebook follower count';frame.width='300';frame.height='80';frame.loading='eager';frame.scrolling='no';frame.style.cssText='border:0;overflow:hidden';frame.tabIndex=-1;frame.referrerPolicy='strict-origin-when-cross-origin';node.append(frame);}if(show)node.style.setProperty('--ig-scale',String(parseFloat(getComputedStyle(node).fontSize)/40));}
 async function update(s){if(s.busy||document.hidden)return;s.busy=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(s.url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Fuente no disponible');const data=await response.json(),value=data[s.field];if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!Number.isSafeInteger(value)||value<0)throw Error('Lectura inválida');
   animate(s,value);s.value=value;s.updated=data.updated_at||null;
   const sourceDate=s.updated?Date.parse(s.updated):NaN;
   s.checked=data.source_stale?(Number.isFinite(sourceDate)?sourceDate:Date.now()-ttl):Date.now();
   s.node.dataset.state=data.source_stale?'stale':'ready';s.node.title=data.fuente+(data.source_stale?' · último dato disponible':'')+(s.updated?' · '+new Date(s.updated).toLocaleString('es-PE'):'');save(s);if(s.name==='Facebook')facebookVisual(false);
  }catch{if(s.value===null){s.node.textContent='—';s.node.dataset.state='unavailable';s.node.title='Fuente no disponible. Se volverá a consultar.';if(s.name==='Facebook')facebookVisual(true);}else{s.node.dataset.state='stale';s.node.title='Último dato verificado; la fuente no respondió ahora';}}
  finally{clearTimeout(timer);s.busy=false;total();}
 }
 sources.forEach(restore);facebookVisual(true);total();
 const firstUpdates=sources.map(update);
 const reveal=()=>document.documentElement?.classList?.add('counters-ready');
 const revealTimer=setTimeout(reveal,6000);
 Promise.allSettled(firstUpdates).then(()=>{clearTimeout(revealTimer);reveal()});
 setInterval(()=>{sources.forEach(s=>{if(s.value!==null&&s.checked&&Date.now()-s.checked>ttl){s.value=null;s.node.textContent='—';}});total();sources.forEach(update);},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sources.forEach(update)});addEventListener('online',()=>sources.forEach(update));
 addEventListener('resize',()=>{const f=document.querySelector('.facebook-counter');if(f&&!f.hidden)f.style.setProperty('--ig-scale',String(parseFloat(getComputedStyle(f).fontSize)/40));},{passive:true});
})();
