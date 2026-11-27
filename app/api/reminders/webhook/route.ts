import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function db() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
}
export async function GET(req:Request) {
 const url=new URL(req.url);
 const mode=url.searchParams.get('hub.mode'), token=url.searchParams.get('hub.verify_token'), challenge=url.searchParams.get('hub.challenge');
 if(mode==='subscribe'&&token&&token===process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN&&challenge) return new Response(challenge,{status:200});
 return NextResponse.json({error:'Webhook verification failed'},{status:403});
}
export async function POST(req:Request) {
 const appSecret=process.env.WHATSAPP_APP_SECRET;
 const raw=await req.text(), signature=req.headers.get('x-hub-signature-256')||'';
 // Fail closed with the same response used for every unverifiable signature.
 // Do not reveal whether the app secret is configured.
 if(!appSecret) return NextResponse.json({error:'Invalid signature'},{status:401});
 const expected='sha256='+crypto.createHmac('sha256',appSecret).update(raw).digest('hex');
 const a=Buffer.from(signature),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return NextResponse.json({error:'Invalid signature'},{status:401});
 let body:any; try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const client=db();
 if(client){
  for(const entry of body.entry||[]) for(const change of entry.changes||[]) {
   const value=change.value||{};
   for(const status of value.statuses||[]) {
    if(status.id) await client.from('ie_reminder_delivery_logs').update({status:status.status==='delivered'?'delivered':status.status==='failed'?'failed':'sent',error_message:status.errors?JSON.stringify(status.errors).slice(0,1000):null}).eq('provider_message_id',status.id);
   }
   for(const msg of value.messages||[]) {
    const phone='+'+(msg.from||'');
    const text=(msg.text?.body||msg.button?.text||'').trim().toUpperCase();
    if(text==='START'||text==='SUBSCRIBE') await client.from('ie_reminder_subscribers').update({status:'active',verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('phone_e164',phone).eq('status','pending');
    if(text==='STOP'||text==='UNSUBSCRIBE') await client.from('ie_reminder_subscribers').update({status:'unsubscribed',updated_at:new Date().toISOString()}).eq('phone_e164',phone);
    if(text==='PAUSE') await client.from('ie_reminder_subscribers').update({status:'paused',updated_at:new Date().toISOString()}).eq('phone_e164',phone);
    if(text==='RESUME') await client.from('ie_reminder_subscribers').update({status:'active',updated_at:new Date().toISOString()}).eq('phone_e164',phone).in('status',['paused','unsubscribed']);
   }
  }
 }
 return NextResponse.json({received:true});
}
