import http from 'node:http';
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
// Optional local-only proxy. MODEL_API_URL must accept the documented chat-shaped JSON contract.
const server=http.createServer(async(req,res)=>{
 if(req.url!=='/api/summary'||req.method!=='POST')return send(res,404,{error:'not_found'});
 const origin=req.headers.origin;if(origin&&!/^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin))return send(res,403,{error:'origin_denied'});
 if(!process.env.MODEL_API_URL||!process.env.MODEL_API_KEY||!process.env.MODEL_NAME)return send(res,200,{mode:'mock'});
 try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>200000)return send(res,413,{error:'too_large'});}const input=JSON.parse(body);if(!input.facts||!Array.isArray(input.facts.source_event_ids))return send(res,400,{error:'invalid_input'});
 const response=await fetch(process.env.MODEL_API_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MODEL_API_KEY}`},body:JSON.stringify({model:process.env.MODEL_NAME,messages:[{role:'system',content:'Return only the provided facts object as JSON, preserving every field and value exactly. Do not add medical judgments, recommendations or inferred facts. The facts object defines the output schema.'},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'}}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('upstream');const result=await response.json();const candidate=JSON.parse(result.choices?.[0]?.message?.content??'null');send(res,200,{mode:'real',candidate});
 }catch{send(res,200,{mode:'mock',reason:'upstream_unavailable'});}
});
server.listen(8787,'127.0.0.1',()=>console.log('CareDose optional summary proxy: http://127.0.0.1:8787'));
