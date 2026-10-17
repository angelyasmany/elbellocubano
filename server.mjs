import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import handler from './api/contadores.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const networks={followers:'tiktok',instagram:'instagram',facebook:'facebook',youtube:'youtube'};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png'};
export const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const endpoint=url.pathname.slice(5);
   if(endpoint!=='contadores'&&!networks[endpoint]){res.writeHead(404).end();return;}
   req.query={network:networks[endpoint]||url.searchParams.get('network')};
   await handler(req,res);return;
  }
  const path=decodeURIComponent(url.pathname);
  if(path!=='/'&&path!=='/index.html'&&path!=='/promociones.html'&&path!=='/site-config.js'&&path!=='/contact.js'&&path!=='/counters.js'&&path!=='/page-ready.js'&&!/^\/assets\/[a-z0-9-]+\.webp$/.test(path)){res.writeHead(404).end();return;}
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(body);
 }catch{res.writeHead(404).end();}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Abre http://localhost:'+server.address().port));
