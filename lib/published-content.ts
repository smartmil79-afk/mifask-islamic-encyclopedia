import { createClient } from '@supabase/supabase-js';
import type { Article } from '@/lib/content';

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
type DbArticle = {
  id:string; slug:string; title:string; summary:string|null; content:any; arabic_text:string|null;
  status:string; reading_minutes:number|null; tags:string[]|null; featured:boolean|null;
  reference_texts:string[]|null; verification_status?:string; reviewer_name?:string|null; verified_at?:string|null; category: {name:string;slug:string}|{name:string;slug:string}[]|null;
};
function mapArticle(row:DbArticle):Article {
  const cat=Array.isArray(row.category)?row.category[0]:row.category;
  const paragraphs=Array.isArray(row.content)?row.content.map(String):typeof row.content==='string'?[row.content]:[];
  const tags=row.tags||[];
  return {id:row.slug,title:row.title,category:cat?.name||'Islamic Knowledge',summary:row.summary||'',readTime:row.reading_minutes?row.reading_minutes+' min read':'Reading time',tag:tags[0]||'Encyclopedia',featured:Boolean(row.featured),arabic:row.arabic_text||undefined,body:paragraphs,references:row.reference_texts||[],verificationStatus:row.verification_status||'unverified',reviewerName:row.reviewer_name||undefined,verifiedAt:row.verified_at||undefined};
}
export async function getPublishedArticles():Promise<Article[]> {
  const sb=client(); if(!sb)return [];
  const {data,error}=await sb.from('ie_articles').select('id,slug,title,summary,content,arabic_text,status,reading_minutes,tags,featured,reference_texts,verification_status,reviewer_name,verified_at,category:ie_categories(name,slug)').eq('status','published').order('published_at',{ascending:false});
  if(error){console.error('Encyclopedia query failed',error.message);return [];}
  return (data||[]).map((row:any)=>mapArticle(row));
}
export async function getPublishedArticle(slug:string):Promise<Article|null>{
  const sb=client();if(!sb)return null;
  const {data,error}=await sb.from('ie_articles').select('id,slug,title,summary,content,arabic_text,status,reading_minutes,tags,featured,reference_texts,verification_status,reviewer_name,verified_at,category:ie_categories(name,slug)').eq('slug',slug).eq('status','published').maybeSingle();
  if(error){console.error('Encyclopedia article query failed',error.message);return null;}
  return data?mapArticle(data as DbArticle):null;
}
export async function getPublishedArticlesInCategory(slug:string):Promise<Article[]>{
  const sb=client();if(!sb)return [];
  const {data:cat}=await sb.from('ie_categories').select('id').eq('slug',slug).maybeSingle();
  if(!cat)return [];
  const {data,error}=await sb.from('ie_articles').select('id,slug,title,summary,content,arabic_text,status,reading_minutes,tags,featured,reference_texts,category:ie_categories(name,slug)').eq('category_id',cat.id).eq('status','published').order('published_at',{ascending:false});
  if(error){console.error('Encyclopedia category query failed',error.message);return [];}
  return (data||[]).map((row:any)=>mapArticle(row));
}
