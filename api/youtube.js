module.exports=async(req,res)=>{
 if(req.method&&req.method!=='GET')return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
 const {countResponse}=await import('./_counts.mjs');
 const response=await countResponse('youtube',{env:process.env});
 for(const [key,value]of response.headers)res.setHeader(key,value);
 return res.status(response.status).json(await response.json());
};
