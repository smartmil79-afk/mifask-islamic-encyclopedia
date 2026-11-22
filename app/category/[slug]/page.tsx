import Link from 'next/link';
import { redirect } from 'next/navigation';
import { categories, articles } from '@/lib/content';
import { getPublishedArticlesInCategory } from '@/lib/published-content';
import ArticleCard from '@/components/ArticleCard';
export function generateStaticParams(){return categories.map(c=>({slug:c.id}));}
export const dynamic = 'force-dynamic';
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug==='quran') redirect('/quran');
 if(slug==='hadith') redirect('/hadith');
 const category=categories.find(c=>c.id===slug);
 if(!category)return <div className="page-shell empty-state"><h1>Category not found</h1><Link href="/explore">Return to Explore</Link></div>;
 const live=await getPublishedArticlesInCategory(slug);
 const fallback=articles.filter(a=>a.category===category.title||(slug==='prophets'&&a.category==='The Prophets'));
 const list=[...live,...fallback.filter(f=>!live.some(l=>l.id===f.id))];
 return <div className="page-shell"><div className="page-hero category-hero"><span className={`category-icon ${category.color}`}>{category.icon}</span><span className="section-kicker">Knowledge category</span><h1>{category.title}</h1><p>{category.subtitle}</p><span className="category-count">{category.count}</span></div><section className="section"><div className="section-heading"><div><h2>Explore {category.title}</h2><p className="muted">Articles and learning resources</p></div></div>{slug==='prophets'&&<div className="section-heading"><Link className="button button-outline" href="/prophets">Open Qur’an reference index →</Link></div>}{slug==='seerah'&&<div className="section-heading"><Link className="button button-outline" href="/seerah">Open Qur’anic Seerah reference index →</Link></div>}{list.length?<div className="article-grid">{list.map(a=><ArticleCard key={a.id} article={a}/>)}</div>:<div className="empty-state"><h3>Content library in progress</h3><p>This section is being prepared. Content will appear as articles pass editorial review and are published.</p>{slug==='hadith'?<Link href="/hadith" className="text-link">Open Hadith & Sunnah Explorer →</Link>:<Link href="/explore" className="text-link">Explore other topics →</Link>}</div>}</section></div>
}
