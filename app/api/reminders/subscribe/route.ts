import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

const allowedTypes = new Set(['quran','hadith','reflection']);
const allowedDays = new Set([0,1,2,3,4,5,6]);
function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/[\s().-]/g, '');
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  return cleaned;
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body.phone);
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({error:'Enter your WhatsApp number in international format, e.g. +2348012345678.'},{status:400});
    const types = Array.isArray(body.reminderTypes) ? body.reminderTypes.filter((x:unknown)=>typeof x==='string'&&allowedTypes.has(x)) : [];
    const weekdays = Array.isArray(body.weekdays) ? body.weekdays.filter((x:unknown)=>Number.isInteger(x)&&allowedDays.has(x as number)) : [];
    if (!types.length || !weekdays.length) return NextResponse.json({error:'Choose at least one reminder type and one delivery day.'},{status:400});
    if (body.consent !== true) return NextResponse.json({error:'Consent is required to subscribe.'},{status:400});
    const preferredTime = typeof body.preferredTime==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.preferredTime) ? body.preferredTime : '06:00';
    const timezone = typeof body.timezone==='string' && body.timezone.length<=80 ? body.timezone : 'Africa/Lagos';
    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({error:'Subscription is temporarily unavailable. Please try again later.'},{status:503});
    const {error} = await supabase.from('ie_reminder_subscribers').upsert({
      phone_e164: phone, timezone, preferred_time: preferredTime, reminder_types: types,
      weekdays, consent:true, consent_at:new Date().toISOString(), consent_source:'website_daily_reminders',
      status:'pending', updated_at:new Date().toISOString()
    },{onConflict:'phone_e164'});
    if (error) {
      console.error('Reminder signup error',error.message);
      return NextResponse.json({error:'We could not save your subscription. Please try again.'},{status:500});
    }
    return NextResponse.json({success:true,message:'Your request has been saved. WhatsApp confirmation will be enabled when the reminder service is connected.'});
  } catch {
    return NextResponse.json({error:'Invalid request. Please try again.'},{status:400});
  }
}
