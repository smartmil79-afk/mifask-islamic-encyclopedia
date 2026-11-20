'use client';

type IntegrityArticle = {
  id:string; title:string; slug:string; summary:string|null; content:any; status:string;
  category_id:string|null; reference_texts?:string[]|null; reviewer_name?:string|null;
  verification_status?:string|null; verified_by?:string|null; verified_at?:string|null;
  verification_notes?:string|null; tags?:string[]|null;
};
type IntegrityCategory={id:string;name:string;slug:string};

type Issue={severity:'error'|'warning'|'info';article:IntegrityArticle;message:string};

const genericReference=/selected narrations|recognized hadith collections|individual entries require|sources? (?:to be|require) verified|references? (?:to be|require) verified/i;
const refLooksSpecific=(r:string)=>/qur.?an\s+\d|\b\d{1,3}:\d{1,3}\b|sahih|sunna|hadith|book of|volume|chapter|doi|isbn|https?:\/\//i.test(r);

export default function EditorialIntegrity({articles,categories}:{articles:IntegrityArticle[];categories:IntegrityCategory[]}){
 const issues:Issue[]=[];
 const slugs=new Map<string,IntegrityArticle[]>();
 const titles=new Map<string,IntegrityArticle[]>();
 for(const a of articles){const s=(a.slug||'').trim().toLowerCase();if(s){slugs.set(s,[...(slugs.get(s)||[]),a]);}const t=(a.title||'').trim().toLowerCase();if(t)titles.set(t,[...(titles.get(t)||[]),a]);}
 for(const group of slugs.values())if(group.length>1)group.forEach(a=>issues.push({severity:'error',article:a,message:'Duplicate slug shared by '+group.map(x=>x.title).join(' / ')}));
 for(const group of titles.values())if(group.length>1)group.forEach(a=>issues.push({severity:'warning',article:a,message:'Duplicate or near-duplicate title'}));
 const catIds=new Set(categories.map(c=>c.id));
 for(const a of articles){
  if(!a.title?.trim())issues.push({severity:'error',article:a,message:'Title is empty'});
  if(!a.slug?.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug))issues.push({severity:'error',article:a,message:'Slug missing or not URL-safe'});
  if(!a.summary?.trim())issues.push({severity:'warning',article:a,message:'Summary missing'});
  const paragraphs=Array.isArray(a.content)?a.content:typeof a.content==='string'?[a.content]:[];
  if(!paragraphs.some(p=>String(p).trim()))issues.push({severity:'error',article:a,message:'Article body is empty'});
  if(!a.category_id||!catIds.has(a.category_id))issues.push({severity:'warning',article:a,message:'Category missing or no longer exists'});
  const refs=(a.reference_texts||[]).map(r=>String(r).trim()).filter(Boolean);
  if(!refs.length)issues.push({severity:a.status==='published'?'error':'warning',article:a,message:'No citations recorded'});
  else if(refs.some(r=>genericReference.test(r)))issues.push({severity:'warning',article:a,message:'Reference contains a generic placeholder rather than a specific citation'});
  else if(refs.some(r=>!refLooksSpecific(r)))issues.push({severity:'warning',article:a,message:'One or more references may be too vague to independently locate'});
  if(a.status==='published'&&a.verification_status!=='verified')issues.push({severity:'warning',article:a,message:'Published while verification status is not “verified”'});
  if(a.verification_status==='verified'&&(!a.verified_by&&!a.reviewer_name||!a.verified_at))issues.push({severity:'warning',article:a,message:'Verified status lacks reviewer identity or timestamp'});
  if((a.status==='review'||a.verification_status==='unverified')&&!a.verification_notes?.trim())issues.push({severity:'info',article:a,message:'Editorial notes are absent'});
 }
 const errors=issues.filter(i=>i.severity==='error').length;
 const warnings=issues.filter(i=>i.severity==='warning').length;
 const infos=issues.filter(i=>i.severity==='info').length;
 const coverage=categories.map(category=>({category,count:articles.filter(a=>a.category_id===category.id).length}));
 const uncovered=coverage.filter(row=>row.count===0);
 return <section className="integrity-report">
  <div className="admin-stats">
   <div><strong>{articles.length}</strong><span>Records scanned</span></div>
   <div><strong>{errors}</strong><span>Errors</span></div>
   <div><strong>{warnings}</strong><span>Warnings</span></div>
   <div><strong>{infos}</strong><span>Editorial notes</span></div>
  </div>
  <p className="admin-review-warning">Automated checks identify missing fields, consistency issues and citation-format concerns. They do not validate the authenticity of Hadith, correctness of Qur’anic references, or scholarly claims.</p>
  <h3>Category coverage</h3><div className="admin-table"><div className="admin-row admin-row-header"><span>Category</span><span>Articles</span><span>Coverage</span></div>{coverage.map(row=><div className="admin-row" key={row.category.id}><span><strong>{row.category.name}</strong></span><span>{row.count}</span><span>{row.count===0?'No articles':'Has content'}</span></div>)}</div>{uncovered.length>0&&<p className="admin-review-warning">Categories with no CMS articles: {uncovered.map(x=>x.category.name).join(', ')}. These are coverage gaps, not proof that the topic is absent elsewhere on the site.</p>}
  {issues.length===0?<div className="admin-empty">No structural integrity issues detected in this scan.</div>:<div className="admin-table">
   <div className="admin-row admin-row-header"><span>Article / Issue</span><span>Severity</span><span>Slug</span></div>
   {issues.map((issue,index)=><div className="admin-row" key={issue.article.id+'-'+index}>
    <span><strong>{issue.article.title||'(Untitled)'}</strong><small>{issue.message}</small></span>
    <span><i className={'status-pill '+issue.severity}>{issue.severity}</i></span>
    <span><small>/{issue.article.slug}</small></span>
   </div>)}
  </div>}
  <p className="admin-word-count">Scanned {articles.length} records across {categories.length} categories. Findings are grouped by article and can be resolved in Edit Article.</p>
 </section>;
}