'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { categories as fallbackCategories, articles as fallbackArticles, type Article, type Category } from '@/lib/content';
import { getSupabaseClient } from '@/lib/supabase';
import CategoryCard from '@/components/CategoryCard';
import ArticleCard from '@/components/ArticleCard';
import SearchBox from '@/components/SearchBox';
type DbCategory={id:string;slug:string;name:string;description:string|null;icon:string|null;sort_order:number};
type DbArticle={id:string;slug:string;title:string;summary:string|null;content:any;arabic_text:string|null;reading_minutes:number|null;tags:string[]|null;featured:boolean|null;reference_texts:string[]|null;category:{name:string;slug:string}|{name:string;slug:string}[]|null};
function mapCategory(c:DbCategory):Category {const fallback=fallbackCategories.find(x=>x.id===c.slug);return {id:c.slug,title:c.name,subtitle:c.description||fallback?.subtitle||'',icon:c.icon||fallback?.icon||'✦',count:fallback?.count||'Explore',color:fallback?.color||'sage',href:'/category/'+c.slug};}
function mapArticle(a:DbArticle):Article {const cat=Array.isArray(a.category)?a.category[0]:a.category;const content=Array.isArray(a.content)?a.content.map(String):[];return {id:a.slug,title:a.title,category:cat?.name||'Islamic Knowledge',summary:a.summary||'',readTime:a.reading_minutes? a.reading_minutes+' min read':'Reading time',tag:a.tags?.[0]||'Encyclopedia',featured:Boolean(a.featured),arabic:a.arabic_text||undefined,body:content,references:a.reference_texts||[]};}
function ExploreContent(){
 const params=useSearchParams();const q=(params.get('q')||'').trim().toLowerCase();
 const [libraryArticles,setLibraryArticles]=useState<Article[]>(fallbackArticles);
 const [libraryCategories,setLibraryCategories]=useState<Category[]>(fallbackCategories);
 useEffect(()=>{const sb=getSupabaseClient();if(!sb)return;let active=true;
  (async()=>{const [cRes,aRes]=await Promise.all([sb.from('ie_categories').select('id,slug,name,description,icon,sort_order').eq('is_active',true).order('sort_order'),sb.from('ie_articles').select('id,slug,title,summary,content,arabic_text,reading_minutes,tags,featured,reference_texts,category:ie_categories(name,slug)').eq('status','published').order('published_at',{ascending:false})]);
  if(!active)return;if(cRes.data?.length)setLibraryCategories(cRes.data.map(mapCategory));if(aRes.data?.length)setLibraryArticles([...aRes.data.map((a:any)=>mapArticle(a)),...fallbackArticles.filter(f=>!aRes.data!.some((a:any)=>a.slug===f.id))]);})();
 return()=>{active=false;};},[]);
 const filtered=libraryArticles.filter(a=>!q||[a.title,a.category,a.summary,a.tag,a.body.join(' '),a.references.join(' ')].join(' ').toLowerCase().includes(q));
 const cats=libraryCategories.filter(c=>!q||[c.title,c.subtitle,c.id].join(' ').toLowerCase().includes(q));
 return <div className="page-shell"><div className="page-hero"><span className="section-kicker">The knowledge library</span><h1>Explore Islamic knowledge</h1><p>Browse a growing collection of topics or search for something specific.</p><SearchBox large placeholder="Search articles, categories, concepts…"/></div>{q&&<div className="search-results-note">Showing results for <strong>“{q}”</strong></div>}<section className="section"><div className="section-heading"><div><h2>Categories</h2><p className="muted">Explore by subject</p></div></div><div className="category-grid">{cats.map(c=><CategoryCard key={c.id} category={c}/>)}</div></section><section className="section"><div className="section-heading"><div><h2>Articles</h2><p className="muted">Found {filtered.length} article{filtered.length===1?'':'s'}</p></div></div>{filtered.length?<div className="article-grid">{filtered.map(a=><ArticleCard key={a.id} article={a}/>)}</div>:<div className="empty-state"><h3>No articles found</h3><p>Try a broader search term or explore a category above.</p></div>}</section></div>}
export default function Explore(){return <Suspense fallback={<div className="page-shell empty-state">Loading library…</div>}><ExploreContent/></Suspense>}
