/* el Bello Cubano — contadores numéricos verificados (sin iframes de terceros). */
(()=>{'use strict';
 const fmt=new Intl.NumberFormat('es-PE');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const VALID_FOR=7*24*60*60*1000; // última lectura verificada, marcada como antigua
 const networks=[
  {name:'TikTok',id:'tt-followers',url:'/api/tiktok',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano'},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano'},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ];
 const sources=networks.map(item=>({...item,
  node:document.getElementById(item.id),
  link:document.querySelector('[data-social="'+item.name+'"]'),
  value:null,shown:null,visible:false,motion:null,busy:false,checked:0,updated:null,state:'unavailable'
 })).filter(s=>s.node);
 const totalNode=document.getElementById('reach-total');
 const reach=document.getElementById('reach');
 let totalMotion=null,totalShown=null;
 function number(v){return Number.isSafeInteger(v)&&v>=0;}
 function animate(node,from,to,duration){
  const motion={frame:0,cancel(){cancelAnimationFrame(this.frame);this.frame=0;}};
  if(reduced.matches||document.hidden||from===to){node.textContent=fmt.format(to);return motion;}
  const started=performance.now(),start=from??0;
  function step(now){const t=Math.min(1,(now-started)/duration);const eased=1-Math.pow(1-t,3);
   node.textContent=fmt.format(Math.round(start+(to-start)*eased));
   if(t<1)motion.frame=requestAnimationFrame(step);else motion.frame=0;
  }
  motion.frame=requestAnimationFrame(step);return motion;
 }
 function label(s){
  const suffix=s.name==='YouTube'?'suscriptores':'seguidores';
  const old=s.state==='stale'?' (última cifra comprobada; puede haber cambiado)':'';
  s.node.title=number(s.value)?fmt.format(s.value)+' '+suffix+' · '+s.name+old:'Sin lectura verificable por ahora';
  if(s.link)s.link.setAttribute('aria-label','Abrir '+s.name+(number(s.value)?': '+fmt.format(s.value)+' '+suffix+old:''));
  s.node.dataset.state=s.state;
 }
 function display(s){
  if(!number(s.value)||!s.visible)return;
  if(s.shown===s.value && s.node.textContent!=='—')return;
  s.motion?.cancel();
  const from=s.shown;
  s.shown=s.value;
  s.motion=animate(s.node,from,s.value,from===null?1700:700);
 }
 function restore(s){
  try{
   const raw=localStorage.getItem('ebc-verified-v2:'+s.name+':'+s.account);
   const item=JSON.parse(raw);
   if(!item||!number(item.value)||!Number.isFinite(item.checked)||item.checked>Date.now()+60000||Date.now()-item.checked>VALID_FOR)return;
   s.value=item.value;s.checked=item.checked;s.updated=item.updated||null;s.state='stale';
   label(s);
  }catch{/* Storage puede estar desactivado por el navegador. */}
 }
 function save(s){
  try{localStorage.setItem('ebc-verified-v2:'+s.name+':'+s.account,
   JSON.stringify({value:s.value,checked:s.checked,updated:s.updated}));}catch{}
 }
 function total(){
  if(!totalNode)return;
  const known=sources.filter(s=>number(s.value));
  if(!known.length){totalNode.textContent='—';reach.dataset.state='waiting';return;}
  const sum=known.reduce((n,s)=>n+s.value,0);
  if(!Number.isSafeInteger(sum))return;
  reach.dataset.state=known.length===sources.length?'ready':'partial';
  reach.title='Suma de '+known.map(s=>s.name).join(', ')+'. '+(known.length<sources.length?'Total parcial. ':'')+'Una persona puede seguir varias cuentas; no representa alcance ni visualizaciones garantizadas.';
  if(totalShown===sum)return;
  totalMotion?.cancel();
  const old=totalShown;totalShown=sum;
  totalMotion=animate(totalNode,old,sum,old===null?1700:750);
 }
 async function update(s){
  if(s.busy||document.hidden)return;
  s.busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Error de la fuente');
   const data=await response.json(),value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!number(value))throw Error('No hay contador verificable');
   s.value=value;s.updated=data.updated_at||null;s.state=data.source_stale?'stale':'ready';
   // Si el servidor advierte que el dato es viejo, no renovar artificialmente su fecha.
   const stamp=s.updated?Date.parse(s.updated):NaN;
   s.checked=data.source_stale&&Number.isFinite(stamp)?stamp:Date.now();
   save(s);label(s);display(s);
  }catch{
   // Plan B: solo la última cifra numérica verificada, nunca un iframe ni una estimación.
   if(!number(s.value)){
    s.node.textContent='—';s.state='unavailable';
   }else{s.state='stale';display(s);}
   label(s);
  }finally{clearTimeout(timeout);s.busy=false;total();}
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const e of entries){const s=sources.find(s=>s.node===e.target);if(s&&e.isIntersecting){s.visible=true;display(s);observer.unobserve(e.target);}}
 },{threshold:0.05}):null;
 for(const s of sources){restore(s);label(s);if(observer)observer.observe(s.node);else s.visible=true;}
 // Durante la primera carga, si hay un valor guardado, igualmente arranca desde cero.
 total();
 const first=sources.map(update);
 const show=()=>document.documentElement.classList.add('counters-ready');
 const timeout=setTimeout(show,1800);
 Promise.allSettled(first).then(()=>{clearTimeout(timeout);show();});
 setInterval(()=>sources.forEach(update),45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sources.forEach(update);});
 window.addEventListener('online',()=>sources.forEach(update));
})();
