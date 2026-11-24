import { createClient } from "npm:@supabase/supabase-js@2.89.0";
const cors = {"Access-Control-Allow-Origin":"https://krishansir.online","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const reply = (status:number, body:object) => new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req => {
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST") return reply(405,{error:"Method not allowed"});
  try {
    const auth=req.headers.get("Authorization") || "";
    if(!auth.startsWith("Bearer ")) return reply(401,{error:"Login required"});
    const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_ANON_KEY")!;
    const client=createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:user,error:authError}=await client.auth.getUser(auth.slice(7));
    if(authError||!user.user) return reply(401,{error:"Invalid session"});
    const {data:allowed,error:roleError}=await client.rpc("ksol_presentation_admin");
    if(roleError||allowed!==true) return reply(403,{error:"Admin only"});
    const body=await req.json();
    const id=body?.id;
    if(typeof id!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply(400,{error:"Invalid presentation"});
    const {data:row,error:rowError}=await client.from("ksol_presentations").select("id,status").eq("id",id).maybeSingle();
    if(rowError||!row) return reply(404,{error:"Presentation not found"});
    if(row.status!=="queued") return reply(200,{dispatched:false,status:row.status});
    const token=Deno.env.get("STUDY_PPT_GITHUB_DISPATCH_TOKEN");
    if(!token) return reply(503,{error:"Automatic trigger not configured"});
    const result=await fetch("https://api.github.com/repos/tcoe96096/krishansironline/actions/workflows/study-ppt-conversion.yml/dispatches",{method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},body:JSON.stringify({ref:"main"})});
    if(!result.ok) return reply(502,{error:"Conversion dispatch unavailable"});
    return reply(200,{dispatched:true});
  } catch { return reply(500,{error:"Conversion trigger unavailable"}); }
});
