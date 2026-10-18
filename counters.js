(() => {
 'use strict';
 const formatter=new Intl.NumberFormat('es-PE');
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const poster=document.getElementById('poster');
 const configs=[
  {id:'tt-followers',network:'TikTok',url:'/api/followers',field:'tiktok',account:'elbellocubano7',unit:'seguidores'},
  {id:'ig-followers',network:'Instagram',url:'/api/instagram',field:'count',account:'elbellocubano',unit:'seguidores'},
  {id:'fb-followers',network:'Facebook',url:'/api/facebook',field:'count',account:'elbellocubano',unit:'seguidores'},
  {id:'yt-subscribers',network:'YouTube',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ',unit:'suscriptores'}
 ];
 const states=configs.map(config=>({...config,node:document.getElementById(config.id),link:document.querySelector(`[data-social="${config.network}"]`),busy:false,value:null,shown:null,updated:null,frame:null,controller:null})).filter(state=>state.node);
 let started=false;
 function stop(state){if(state.frame!==null){cancelAnimationFrame(state.frame);state.frame=null;}}
 function render(state,value){state.shown=value;state.node.textContent=formatter.format(value);}
 function animate(state,value){
  stop(state);
  if(motion.matches||document.hidden){render(state,value);return;}
  const from=state.shown??0;
  if(from===value){render(state,value);return;}
  const initial=state.value===null,duration=initial?2200:700,start=performance.now();
  render(state,from);
  function step(now){
   const progress=Math.min(Math.max((now-start)/duration,0),1);
   render(state,Math.round(from+(value-from)*(1-Math.pow(1-progress,3))));
   if(progress<1)state.frame=requestAnimationFrame(step);
   else{state.frame=null;render(state,value);}
  }
  state.frame=requestAnimationFrame(step);
 }
 async function update(state){
  if(!started||state.busy||document.hidden)return;
  if(!/^https?:$/.test(location.protocol)){state.node.textContent='—';state.node.title='Abre la página web para consultar el contador.';return;}
  state.busy=true;const controller=new AbortController();state.controller=controller;
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(state.url,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('No se pudo consultar el contador');
   const data=await response.json(),value=data[state.field];
   if(data.consulta_ok!==true||data.cuenta!==state.account||!Number.isSafeInteger(value)||value<0)throw new Error('Respuesta no válida');
   if(controller.signal.aborted)return;
   state.updated=data.updated_at||null;
   const readingDate=state.updated?new Date(state.updated).toLocaleString('es-PE'):'Fecha del dato no disponible';
   state.node.dataset.state=data.source_stale?'stale':'ready';
   state.node.title=state.unit[0].toUpperCase()+state.unit.slice(1)+' · '+data.fuente+' · '+readingDate+(data.source_stale?' · Último dato disponible':'');
   state.link?.setAttribute('aria-label','Abrir '+state.network+' en una pestaña nueva: '+formatter.format(value)+' '+state.unit);
   animate(state,value);state.value=value;
  }catch(error){
   stop(state);
   if(state.value!==null){render(state,state.value);state.node.dataset.state='stale';state.node.title='Último dato disponible'+(state.updated?': '+new Date(state.updated).toLocaleString('es-PE'):'')+'. No se pudo actualizar ahora.';}
   else{state.node.textContent='—';state.node.dataset.state='unavailable';state.node.title='No se pudo consultar '+state.network+'. Se volverá a intentar automáticamente.';}
  }finally{clearTimeout(timeout);state.controller=null;state.busy=false;}
 }
 const updateAll=()=>states.forEach(update);
 function start(){if(started)return;started=true;updateAll();setInterval(updateAll,5000);}
 if(!poster||poster.dataset.ready==='true')start();
 else document.addEventListener('poster-ready',start,{once:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)states.forEach(state=>{stop(state);state.controller?.abort();if(state.value!==null)render(state,state.value);});
  else updateAll();
 });
 window.addEventListener('online',updateAll);
})();
