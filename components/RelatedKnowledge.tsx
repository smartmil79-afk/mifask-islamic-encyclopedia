import type { Article } from '@/lib/content';
import ArticleCard from '@/components/ArticleCard';

const stopWords=new Set(['the','and','for','with','from','into','about','this','that','islam','islamic','guide','understanding','learn','explore','what','when','where','how','who','its','are','was','were','their','they','has','have','had','you','your','all','one','some','such','through','which','while','also','than','then','but','not','can','will','may','more','less']);

function tokens(text:string){return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopWords.has(w)));}
function overlap(a:Set<string>,b:Set<string>){let n=0;for(const x of a)if(b.has(x))n++;return n;}
function reasons(current:Article,candidate:Article){const labels:string[]=[];if(current.category&&candidate.category&&current.category.toLowerCase()===candidate.category.toLowerCase())labels.push('Same category');if(current.tag&&candidate.tag&&current.tag.toLowerCase()===candidate.tag.toLowerCase())labels.push('Same tag');const wordsA=tokens([current.title,current.summary].join(' '));const wordsB=tokens([candidate.title,candidate.summary].join(' '));if(overlap(wordsA,wordsB)>0)labels.push('Shared topic wording');const refsA=tokens((current.references||[]).join(' '));const refsB=tokens((candidate.references||[]).join(' '));if(overlap(refsA,refsB)>0)labels.push('Reference terminology overlap');return labels;}
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
 const related=articles.filter(a=>a.id!==current.id).map(a=>({article:a,score:score(current,a),reasons:reasons(current,a)})).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score||a.article.title.localeCompare(b.article.title)).slice(0,3);
 if(!related.length)return null;
 return <section className="section related-knowledge"><div className="section-heading"><div><span className="section-kicker">Continue your learning</span><h2>Related knowledge</h2><p className="muted">Suggestions ranked by category, tag, shared wording and reference terminology. Each card shows why it was suggested.</p></div><a className="text-link" href="/knowledge-graph">Explore knowledge graph ↗</a></div><div className="article-grid">{related.map(({article:a,reasons:r})=><div key={a.id} className="related-item"><ArticleCard article={a}/><div className="related-reasons" aria-label="Why this article is suggested">{r.map(reason=><span key={reason}>{reason}</span>)}</div></div>)}</div><p className="related-note">These are editorial navigation suggestions generated from article metadata and text. A connection does not imply equivalence, chronology, authenticity, or scholarly agreement.</p></section>;
}
