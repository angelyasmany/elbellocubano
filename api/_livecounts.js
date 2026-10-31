'use strict';
/**
 * Livecounts.nl: página pública para intentar obtener un dato NUMÉRICO.
 * No se accede al contenido de los iframes desde otro origen: si la web
 * no incluye una cifra identificable, la interfaz mostrará el iframe.
 * Una pantalla embebida nunca se interpreta como JSON ni como número.
 */
const HANDLE = 'elbellocubano';
const PAGES = Object.freeze({
  instagram: 'https://livecounts.nl/instagram-realtime/?u=elbellocubano',
  facebook: 'https://livecounts.nl/es/facebook-realtime/?u=elbellocubano'
});
const EMBEDS = Object.freeze({
  instagram: 'https://livecounts.nl/instagram-realtime/embed/?u=elbellocubano&theme=transparent&size=m&avatar=0&name=0',
  instagram_obs: 'https://livecounts.nl/instagram-realtime/embed/?u=elbellocubano&theme=transparent&size=l&avatar=0&name=0&fx=1',
  facebook: 'https://livecounts.nl/facebook-realtime/embed/?u=elbellocubano'
});
const clean = input => String(input).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
  .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&(?:nbsp|thinsp|#160|#8239);/gi,' ')
  .replace(/&(?:amp|quot|apos);/gi,' ')
  .replace(/\s+/g,' ').trim();
function integerText(input){
 const x=String(input).trim().replace(/[\s\u00a0\u202f]/g,'');
 if(!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(x))throw new Error('Cifra de seguidores no exacta');
 const n=Number(x.replace(/[.,]/g,''));
 if(!Number.isSafeInteger(n)||n<0)throw new Error('Cifra de seguidores inválida');
 return n;
}
function parseLivecountsHTML(html,network){
 if(!['facebook','instagram'].includes(network))throw Error('Red no admitida');
 const body=clean(html);
 // Exigir la identidad en el contenido visible, NO en el URL de la consulta.
 const identity=network==='instagram'
   ? /(?:@elbellocubano\b|instagram\.com\/elbellocubano\b)/i
   : /(?:facebook\.com\/elbellocubano\b|@elbellocubano\b|\bel bello cubano\b)/i;
 const match=identity.exec(body);
 if(!match)throw Error('Livecounts no confirmó la cuenta; se usará el widget visual');
 // El primer número seguido de followers/seguidores después del perfil es
 // el recuento, no los likes, posts o recomendaciones de otros creadores.
 const fragment=body.slice(match.index+match[0].length,match.index+match[0].length+1400);
 const countMatch=fragment.match(/\b(\d{1,3}(?:[.,\u00a0\u202f]\d{3})+|\d{1,12})\s*(?:followers|seguidores)\b/i);
 if(!countMatch)throw Error('Livecounts no publicó una cifra verificable en HTML');
 const count=integerText(countMatch[1]);
 if(count===0)throw Error('Livecounts no confirmó seguidores (cero provisional)');
 return count;
}
async function fetchLivecounts(network,{fetchImpl=fetch,timeoutMs=3800}={}){
 const url=PAGES[network];if(!url)throw Error('Red no admitida');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetchImpl(url,{signal:controller.signal,headers:{Accept:'text/html', 'User-Agent':'Mozilla/5.0 (compatible; ElBelloCubanoCounter/1.0)'}});
  if(!res.ok)throw Error('Livecounts HTTP '+res.status);
  const text=await res.text();
  if(text.length>1200000)throw Error('La respuesta Livecounts supera el límite');
  return {count:parseLivecountsHTML(text,network),fuente:'Livecounts.nl (página pública)',updated_at:new Date().toISOString()};
 }finally{clearTimeout(timer)}
}
module.exports={PAGES,EMBEDS,parseLivecountsHTML,integerText,fetchLivecounts};
