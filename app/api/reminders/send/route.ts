import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const SCHEDULER_INTERVAL_MINUTES = 5;

function serviceDb() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return null;
  return createClient(url,key,{auth:{persistSession:false}});
}
function localParts(date:Date,timeZone:string) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.map(p=>[p.type,p.value]));
}
export async function GET(req:Request) {
  const secret=process.env.REMINDERS_CRON_SECRET||process.env.CRON_SECRET;
  if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`) return NextResponse.json({error:'Unauthorized'},{status:401});
  // Delivery is intentionally fail-closed. The scheduler can be installed before
  // Meta credentials/template approval; no subscriber query occurs while disabled.
  if(process.env.WHATSAPP_SEND_ENABLED!=='true') return NextResponse.json({status:'sending_disabled',message:'Sending remains disabled until WhatsApp credentials, template, and end-to-end test are configured.'},{status:503});
  const db=serviceDb();
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template=process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLanguage=process.env.WHATSAPP_TEMPLATE_LANGUAGE||'en';
  const publicImage=process.env.REMINDER_CARD_IMAGE_URL;
  if(!db||!token||!phoneId||!template) return NextResponse.json({status:'configuration_required',missing:['SUPABASE_SERVICE_ROLE_KEY','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEMPLATE_NAME'].filter(k=>!process.env[k])},{status:503});
  const now=new Date();
  const {data:subs,error}=await db.from('ie_reminder_subscribers').select('id,phone_e164,timezone,preferred_time,reminder_types,weekdays,last_sent_at').eq('status','active').limit(500);
  if(error) return NextResponse.json({error:error.message},{status:500});
  const due=(subs||[]).filter(s=>{
    const p=localParts(now,s.timezone||'Africa/Lagos');
    const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);
    const preferred=String(s.preferred_time||'').slice(0,5);
    const match= /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(preferred);
    if(!match||!s.weekdays?.includes(dow)) return false;
    const [hour,minute]=preferred.split(':').map(Number);
    const currentMinute=Number(p.hour)*60+Number(p.minute);
    const preferredMinute=hour*60+minute;
    // GitHub Actions' minimum supported scheduled cadence is five minutes.
    // Match the five-minute lookback window so arbitrary preferred minutes aren't skipped.
    const elapsed=currentMinute-preferredMinute;
    return elapsed>=0&&elapsed<SCHEDULER_INTERVAL_MINUTES;
  });
  const results=[];
  for(const s of due) {
    const day=localParts(now,s.timezone||'Africa/Lagos');
    const preferred=String(s.preferred_time).slice(0,5);
    const scheduled=`${day.year}-${day.month}-${day.day} ${preferred}`;
    const {data:existing}=await db.from('ie_reminder_delivery_logs').select('id,status').eq('subscriber_id',s.id).eq('scheduled_for_local',scheduled).maybeSingle();
    if(existing){results.push({subscriber:s.id,status:'already_logged'});continue;}
    const contentType=(s.reminder_types||[])[0]||'reflection';
    const components=[];
    if(publicImage) components.push({type:'header',parameters:[{type:'image',image:{link:publicImage}}]});
    components.push({type:'body',parameters:[{type:'text',text:'MIFASK Daily Reminder'},{type:'text',text:contentType}]});
    const payload={messaging_product:'whatsapp',to:s.phone_e164,type:'template',template:{name:template,language:{code:templateLanguage},components}};
    const response=await fetch(`https://graph.facebook.com/${graphVersion}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    const ok=response.ok&&data.messages?.[0]?.id;
    const log={subscriber_id:s.id,phone_e164:s.phone_e164,content_type:contentType,content_reference:'daily-template',provider_message_id:data.messages?.[0]?.id||null,status:ok?'sent':'failed',error_message:ok?null:JSON.stringify(data).slice(0,1000),scheduled_for:now.toISOString(),scheduled_for_local:scheduled,sent_at:ok?now.toISOString():null};
    const {error:logError}=await db.from('ie_reminder_delivery_logs').insert(log);
    if(ok) await db.from('ie_reminder_subscribers').update({last_sent_at:now.toISOString()}).eq('id',s.id);
    results.push({subscriber:s.id,status:ok?'sent':'failed',providerError:ok?undefined:data.error?.message,logError:logError?.message});
  }
  return NextResponse.json({status:'processed',checked:subs?.length||0,due:due.length,results});
}
