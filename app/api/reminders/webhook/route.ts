import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET(req:Request) {
 const url=new URL(req.url);
 const mode=url.searchParams.get('hub.mode');
 const token=url.searchParams.get('hub.verify_token');
 const challenge=url.searchParams.get('hub.challenge');
 if(mode==='subscribe'&&token&&token===process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN&&challenge) return new Response(challenge,{status:200});
 return NextResponse.json({error:'Webhook verification failed'},{status:403});
}
export async function POST(req:Request) {
 const appSecret=process.env.WHATSAPP_APP_SECRET;
 if(!appSecret) return NextResponse.json({error:'Webhook not configured'},{status:503});
 const raw=await req.text();
 const signature=req.headers.get('x-hub-signature-256')||'';
 const expected='sha256='+crypto.createHmac('sha256',appSecret).update(raw).digest('hex');
 const a=Buffer.from(signature),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return NextResponse.json({error:'Invalid signature'},{status:401});
 let body:any;
 try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 // Only acknowledge verified webhook payloads here. Status and inbound handling are added as DB service credentials are configured.
 return NextResponse.json({received:true,entries:body.entry?.length||0});
}
