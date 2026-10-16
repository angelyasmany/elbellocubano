import {tikTokResponse} from '../lib/tiktok.mjs';
import {socialCountResponse} from '../lib/social-counts.mjs';
await Promise.all(['tiktok','instagram','facebook','youtube'].map(async network=>{
 const response=await(network==='tiktok'?tikTokResponse():socialCountResponse(network));
 const data=await response.json();
 console.log(JSON.stringify({red:network,http:response.status,...data}));
 if(!response.ok||!data.consulta_ok)process.exitCode=1;
}));
