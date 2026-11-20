import Link from 'next/link';
import type { Article } from '@/lib/content';
export default function ArticleCard({article}:{article:Article}) { return <Link href={`/article/${article.id}`} className="article-card"><div className="article-top"><span className="article-tag">{article.tag}</span><span className="read-time">{article.readTime}</span></div><h3>{article.title}</h3>{article.arabic && <p className="article-arabic" dir="rtl">{article.arabic}</p>}<p className="article-summary">{article.summary}</p><span className="article-link">Read article <span>→</span></span></Link> }
