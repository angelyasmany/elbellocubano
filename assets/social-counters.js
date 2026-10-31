/* El Bello Cubano: cuatro contadores consultados en paralelo, mostrados y animados juntos.
   Facebook/Instagram se consultan solo mediante sus endpoints oficiales Meta en /api.
   Una cifra antigua solo se presenta si previamente fue comprobada para esta cuenta. */
(()=>{'use strict';
 const fmt=new Intl.NumberFormat('es-PE');
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const VALID_MS=24*60*60*1000;
 const REFRESH_MS=150000;
 const MIN_RETRY_MS=90000;
 const list=[
  {name:'TikTok',id:'tt-followers',url:'/api/tiktok',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano'},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano'},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ];
 const valid=x=>Number.isSafeInteger(x)&&x>=0;
 const sources=list.map(x=>({...x,node:document.getElementById(x.id),link:document.querySelector('[data-social="'+x.name+'"]'),value:null,shown:null,checked:0,updated:null,state:'unavailable'})).filter(x=>x.node);
 if(!sources.length)return;
 const totalNode=document.getElementById('reach-total');
 const reach=document.getElementById('reach');
 let totalShown=null,hasPainted=false,canPaint=false,fetching=false,lastAttempt=0;
 const animations=new Map();
 function animate(node,from,to,duration){
  const before=animations.get(node);if(before)cancelAnimationFrame(before);
  if(reduce.matches||document.hidden||from===to){node.textContent=fmt.format(to);animations.delete(node);return;}
  const origin=performance.now(),initial=from??0;
  const step=(now)=>{
   const ratio=Math.min(1,(now-origin)/duration),ease=1-(1-ratio)**3;
   node.textContent=fmt.format(Math.round(initial+(to-initial)*ease));
   if(ratio<1)animations.set(node,requestAnimationFrame(step));else animations.delete(node);
  };
  animations.set(node,requestAnimationFrame(step));
 }
 function label(s){
  const suffix=s.name==='YouTube'?'suscriptores':'seguidores';
  const age=s.state==='stale'?' (último dato comprobado, podría haber cambiado)':'';
  s.node.title=valid(s.value)?fmt.format(s.value)+' '+suffix+' · '+s.name+age:'Contador no disponible: se requiere una respuesta válida de la API';
  s.node.dataset.state=s.state;
  if(s.link)s.link.setAttribute('aria-label','Abrir '+s.name+(valid(s.value)?': '+fmt.format(s.value)+' '+suffix+age:''));
 }
 function restore(s){
  try{
   const item=JSON.parse(localStorage.getItem('ebc-verified-v3:'+s.name+':'+s.account));
   if(!item||!valid(item.value)||!Number.isFinite(item.checked)||item.checked>Date.now()+60000||Date.now()-item.checked>VALID_MS)return;
   s.value=item.value;s.checked=item.checked;s.updated=item.updated||null;s.state='stale';
  }catch{/* almacenamiento no disponible */}
 }
 function save(s){
  try{localStorage.setItem('ebc-verified-v3:'+s.name+':'+s.account,JSON.stringify({value:s.value,checked:s.checked,updated:s.updated}));}catch{}
 }
 // renderizar todos los números en un mismo ciclo, sin esperar a que cada API
 // termine por separado. Si falta una red, NO se publica una suma parcial.
 function paint(){
  if(!canPaint)return;
  for(const s of sources){
   const value=s.value;
   if(valid(value)){
    const from=s.shown;s.shown=value;
    if(!hasPainted||from!==value)animate(s.node,from,value,from===null?1500:650);
   }else{s.shown=null;s.node.textContent='—';}
   label(s);
  }
  if(totalNode){
   const all=sources.length===4&&sources.every(s=>valid(s.value));
   if(all){
    const sum=sources.reduce((n,s)=>n+s.value,0);
    if(Number.isSafeInteger(sum)){
     if(!hasPainted||sum!==totalShown)animate(totalNode,totalShown,sum,totalShown===null?1500:650);
     totalShown=sum;
     if(reach){reach.dataset.state='ready';reach.title='Suma de TikTok, Facebook, Instagram y YouTube. Una persona puede seguir varias cuentas; no son espectadores únicos.';}
    }
   }else{
    totalShown=null;totalNode.textContent='—';
    if(reach){reach.dataset.state='waiting';reach.title='Esperando cifras verificadas de las cuatro redes para mostrar el total completo, sin sumar datos parciales.';}
   }
  }
  hasPainted=true;
  document.documentElement.classList.add('counters-ready');
 }
 // En index, mantener la animación lista hasta que el usuario vea los contadores.
 // En promociones, el bloque entra en pantalla de inmediato.
 const container=document.querySelector('.social')||document.querySelector('.mini-social-summary');
 if('IntersectionObserver' in window&&container){
  const watch=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)){
    canPaint=true;watch.disconnect();paint();
   }
  },{threshold:0.05});watch.observe(container);
 }else canPaint=true;
 for(const s of sources){restore(s);label(s);}
 async function updateOne(s){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json(),value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!valid(value))throw Error('Cifra no verificable');
   const incomingStale=data.source_stale===true;
   const stamp=data.updated_at?Date.parse(data.updated_at):NaN;
   const checked=incomingStale?(Number.isFinite(stamp)&&stamp<=Date.now()+60000?stamp:null):Date.now();
   if(checked===null||Date.now()-checked>VALID_MS)throw Error('Cifra antigua sin fecha confiable');
   // No reemplazar con un dato anterior a otro ya verificado localmente.
   if(s.checked&&checked<s.checked&&valid(s.value)){
    s.state='stale';return;
   }
   s.value=value;s.checked=checked;s.updated=data.updated_at||null;
   s.state=incomingStale?'stale':'ready';save(s);
  }catch(error){
   s.state=valid(s.value)?'stale':'unavailable';
  }finally{clearTimeout(timer);}
 }
 async function refresh(force=false){
  if(fetching||document.hidden)return;
  const now=Date.now();if(!force&&now-lastAttempt<MIN_RETRY_MS)return;
  fetching=true;lastAttempt=now;
  try{await Promise.allSettled(sources.map(updateOne));}
  finally{fetching=false;paint();}
 }
 void refresh(true);
 setInterval(()=>void refresh(),REFRESH_MS);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 window.addEventListener('online',()=>void refresh());
})();
