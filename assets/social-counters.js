/* el Bello Cubano — contadores numéricos sin iframes de terceros.
   No se confunden seguidores acumulados con espectadores únicos. */
(()=>{'use strict';
 const fmt=new Intl.NumberFormat('es-PE');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const VALID_FOR=7*24*60*60*1000;
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
 const valid=v=>Number.isSafeInteger(v)&&v>=0;
 function animate(node,from,to,duration){
  const motion={frame:0,cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}};
  if(reduced.matches||document.hidden||from===to){node.textContent=fmt.format(to);return motion;}
  const started=performance.now(),start=from??0;
  function step(now){const t=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3);
   node.textContent=fmt.format(Math.round(start+(to-start)*eased));
   if(t<1)motion.frame=requestAnimationFrame(step);else motion.frame=0;
  }
  motion.frame=requestAnimationFrame(step);return motion;
 }
 function label(s){
  const suffix=s.name==='YouTube'?'suscriptores':'seguidores';
  const old=s.state==='stale'?' (última cifra comprobada; puede haber cambiado)':'';
  s.node.title=valid(s.value)?fmt.format(s.value)+' '+suffix+' · '+s.name+old:'Sin lectura verificable por ahora';
  if(s.link)s.link.setAttribute('aria-label','Abrir '+s.name+(valid(s.value)?': '+fmt.format(s.value)+' '+suffix+old:''));
  s.node.dataset.state=s.state;
 }
 function display(s){
  if(!valid(s.value)||!s.visible)return;
  if(s.shown===s.value&&s.node.textContent!=='—')return;
  s.motion?.cancel();const from=s.shown;s.shown=s.value;
  s.motion=animate(s.node,from,s.value,from===null?1400:650);
 }
 function restore(s){
  try{
   const item=JSON.parse(localStorage.getItem('ebc-verified-v2:'+s.name+':'+s.account));
   if(!item||!valid(item.value)||!Number.isFinite(item.checked)||item.checked>Date.now()+60000||Date.now()-item.checked>VALID_FOR)return;
   s.value=item.value;s.checked=item.checked;s.updated=item.updated||null;s.state='stale';label(s);
  }catch{/* Almacenamiento deshabilitado. */}
 }
 function save(s){
  try{localStorage.setItem('ebc-verified-v2:'+s.name+':'+s.account,
   JSON.stringify({value:s.value,checked:s.checked,updated:s.updated}));}catch{}
 }
 function total(){
  if(!totalNode)return;
  const known=sources.filter(s=>valid(s.value));
  if(!known.length){totalMotion?.cancel();totalShown=null;totalNode.textContent='—';if(reach)reach.dataset.state='waiting';return;}
  const sum=known.reduce((n,s)=>n+s.value,0);
  if(!Number.isSafeInteger(sum))return;
  if(reach){
   reach.dataset.state=known.length===sources.length?'ready':'partial';
   reach.title='Suma de '+known.map(s=>s.name).join(', ')+'. '+(known.length<sources.length?'Total parcial. ':'')+
    (known.some(s=>s.state==='stale')?'Incluye una o más cifras antiguas. ':'')+
    'Una persona puede seguir varias cuentas: no representa espectadores únicos.';
  }
  if(totalShown===sum)return;
  totalMotion?.cancel();const old=totalShown;totalShown=sum;
  totalMotion=animate(totalNode,old,sum,old===null?1400:650);
 }
 async function update(s){
  if(s.busy||document.hidden)return;
  s.busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Error HTTP '+response.status);
   const data=await response.json(),value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!valid(value))throw Error('Respuesta no verificable');
   const when=data.updated_at?Date.parse(data.updated_at):NaN;
   const incomingStale=data.source_stale===true;
   const now=Date.now();
   // No renovar el plazo de la cifra antigua con una fecha de consulta reciente.
   const checked=incomingStale?(Number.isFinite(when)&&when<=now+60000?when:null):now;
   if(incomingStale&&checked===null&&valid(s.value)){
    s.state='stale';label(s);display(s);return;
   }
   if(incomingStale&&checked!==null&&now-checked>VALID_FOR&&valid(s.value)){
    s.state='stale';label(s);display(s);return;
   }
   s.value=value;s.updated=data.updated_at||null;
   s.state=incomingStale?'stale':'ready';
   if(checked!==null)s.checked=checked;
   if(s.checked&&now-s.checked<=VALID_FOR)save(s);
   label(s);display(s);
  }catch{
   if(valid(s.value)){s.state='stale';display(s);}
   else{s.state='unavailable';s.node.textContent='—';}
   label(s);
  }finally{clearTimeout(timeout);s.busy=false;total();}
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const e of entries){const s=sources.find(s=>s.node===e.target);if(s&&e.isIntersecting){s.visible=true;display(s);observer.unobserve(e.target);}}
 },{threshold:0.05}):null;
 for(const s of sources){restore(s);label(s);if(observer)observer.observe(s.node);else s.visible=true;}
 total();
 const first=sources.map(update);
 const show=()=>document.documentElement.classList.add('counters-ready');
 const timeout=setTimeout(show,1800);
 Promise.allSettled(first).then(()=>{clearTimeout(timeout);show();});
 setInterval(()=>sources.forEach(update),60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sources.forEach(update);});
 window.addEventListener('online',()=>sources.forEach(update));
})();
