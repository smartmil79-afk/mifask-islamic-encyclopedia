import type { Article } from '@/lib/content';
import ArticleCard from '@/components/ArticleCard';

const stopWords=new Set(['the','and','for','with','from','into','about','this','that','islam','islamic','guide','understanding','learn','explore','what','when','where','how','who','its','are','was','were','their','they','has','have','had','you','your','all','one','some','such','through','which','while','also','than','then','but','not','can','will','may','more','less']);

function tokens(text:string){return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopWords.has(w)));}
function overlap(a:Set<string>,b:Set<string>){let n=0;for(const x of a)if(b.has(x))n++;return n;}
function score(current:Article,candidate:Article){
 let n=0;
 if(current.category&&candidate.category&&current.category.toLowerCase()===candidate.category.toLowerCase())n+=5;
 if(current.tag&&candidate.tag&&current.tag.toLowerCase()===candidate.tag.toLowerCase())n+=3;
 const currentWords=tokens([current.title,current.summary,current.body.join(' ')].join(' '));
 const candidateWords=tokens([candidate.title,candidate.summary,candidate.body.join(' ')].join(' '));
 n+=Math.min(overlap(currentWords,candidateWords),4);
 const refsA=tokens((current.references||[]).join(' '));const refsB=tokens((candidate.references||[]).join(' '));
 n+=Math.min(overlap(refsA,refsB),2);
 return n;
}

export default function RelatedKnowledge({current,articles}:{current:Article;articles:Article[]}){
 const related=articles.filter(a=>a.id!==current.id).map(a=>({article:a,score:score(current,a)})).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score||a.article.title.localeCompare(b.article.title)).slice(0,3).map(x=>x.article);
 if(!related.length)return null;
 return <section className="section related-knowledge"><div className="section-heading"><div><span className="section-kicker">Continue your learning</span><h2>Related knowledge</h2><p className="muted">Suggested connections based on topic, category, wording and reference overlap.</p></div><a className="text-link" href="/knowledge-graph">Explore knowledge graph ↗</a></div><div className="article-grid">{related.map(a=><ArticleCard key={a.id} article={a}/>)}</div><p className="related-note">These are editorial navigation suggestions generated from article metadata and text. A connection does not imply equivalence, chronology, authenticity, or scholarly agreement.</p></section>;
}
