import Link from 'next/link';
import { articles, getArticle } from '@/lib/content';
import { getPublishedArticle } from '@/lib/published-content';
export function generateStaticParams(){return articles.map(a=>({slug:a.id}));}
export const dynamic = 'force-dynamic';
export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const live=await getPublishedArticle(slug);
 const article=live||getArticle(slug);
 if(!article)return <div className="page-shell empty-state"><h1>Article not found</h1><Link href="/explore">Explore the encyclopedia</Link></div>;
 return <article className="article-page"><div className="article-breadcrumb"><Link href="/">Home</Link><span>›</span><Link href="/explore">Explore</Link><span>›</span><span>{article.category}</span></div><div className="article-header"><span className="article-tag">{article.tag}</span><h1>{article.title}</h1>{article.arabic&&<div className="article-title-arabic" dir="rtl">{article.arabic}</div>}<p>{article.summary}</p><div className="article-meta">{article.readTime} · Mifask Knowledge Library</div></div><div className="article-content"><div className="source-notice"><strong>Editorial note</strong><p>This article is a learning resource. References should be checked in context. For detailed religious questions, consult qualified scholarship. Content in the new library is subject to editorial review.</p></div>{article.body.map((paragraph,i)=><p key={i}>{paragraph}</p>)}{article.references?.length>0&&<><h2>References</h2><ul>{article.references.map((r,i)=><li key={i}>{r}</li>)}</ul></>}<div className="article-bottom"><Link href="/explore" className="button button-outline">← Back to Explore</Link><span>Developed by Fixable 6Tems Limited</span></div></div></article>
}
