import Link from 'next/link';
import type { Category } from '@/lib/content';
export default function CategoryCard({category}:{category:Category}) { return <Link href={category.href} className={`category-card ${category.color}`}><span className="category-icon">{category.icon}</span><div><h3>{category.title}</h3><p>{category.subtitle}</p><small>{category.count}</small></div><span className="card-arrow">↗</span></Link> }
