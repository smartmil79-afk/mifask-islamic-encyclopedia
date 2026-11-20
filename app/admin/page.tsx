'use client';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type Category = { id: string; name: string; slug: string };
type Article = { id: string; title: string; slug: string; status: string; created_at: string; category_id: string | null };
export default function AdminPage() {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview'|'new'>('overview');

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function verify() {
      if (!supabase || !session?.user) { setAuthorized(false); setChecking(false); return; }
      setChecking(true);
      const {data,error:verifyError} = await supabase.from('ie_admins').select('user_id,active,role').eq('user_id',session.user.id).maybeSingle();
      setAuthorized(Boolean(data?.active && !verifyError));
      setChecking(false);
      if (data?.active) {
        const [catRes, articleRes] = await Promise.all([
          supabase.from('ie_categories').select('id,name,slug').order('sort_order'),
          supabase.from('ie_articles').select('id,title,slug,status,created_at,category_id').order('created_at',{ascending:false}).limit(100)
        ]);
        setCategories(catRes.data || []);
        setArticles(articleRes.data || []);
        if (catRes.data?.length) setCategoryId(catRes.data[0].id);
      }
    }
    verify();
  }, [session]);

  const makeSlug = (value:string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  async function signIn(e:any) {
    e.preventDefault(); setError('');
    if (!supabase) return;
    const {error} = await supabase.auth.signInWithPassword({email,password});
    if (error) setError(error.message);
  }
  async function signOut() { await supabase?.auth.signOut(); setAuthorized(false); }
  async function saveArticle(e:any) {
    e.preventDefault(); if (!supabase) return;
    setSaving(true); setError('');
    const paragraphs = body.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    const {error:saveError} = await supabase.from('ie_articles').insert({
      title, slug: slug || makeSlug(title), summary, category_id: categoryId || null,
      content: paragraphs, status, author_name: session?.user?.email || 'CMS Editor',
      reading_minutes: Math.max(1, Math.ceil(body.trim().split(/\s+/).length/200)),
      tags: [], featured: false, published_at: status==='published' ? new Date().toISOString() : null
    });
    if (saveError) setError(saveError.message);
    else {
      setTitle(''); setSlug(''); setSummary(''); setBody(''); setStatus('draft');
      setTab('overview');
      const {data} = await supabase.from('ie_articles').select('id,title,slug,status,created_at,category_id').order('created_at',{ascending:false}).limit(100);
      setArticles(data || []);
    }
    setSaving(false);
  }
  if (!supabase) return <div className="admin-wrap"><div className="admin-panel"><h1>CMS setup required</h1><p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel Environment Variables, then redeploy.</p></div></div>;
  if (checking) return <div className="admin-wrap"><div className="admin-panel"><p>Checking CMS access…</p></div></div>;
  if (!session) return <div className="admin-wrap"><div className="admin-panel admin-login"><span className="section-kicker">Editorial workspace</span><h1>Admin sign in</h1><p>Sign in with your authorized encyclopedia editor account.</p><form onSubmit={signIn}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="button" type="submit">Sign in</button>{error&&<p className="admin-error">{error}</p>}</form></div></div>;
  if (!authorized) return <div className="admin-wrap"><div className="admin-panel"><h1>Access not authorized</h1><p>Your signed-in account does not have an active Encyclopedia CMS role.</p><button className="button" onClick={signOut}>Sign out</button></div></div>;
  return <div className="admin-wrap"><div className="admin-head"><div><span className="section-kicker">Editorial workspace</span><h1>Encyclopedia CMS</h1><p>Signed in as {session.user.email}</p></div><button className="admin-secondary" onClick={signOut}>Sign out</button></div>
    <div className="admin-stats"><div><strong>{articles.length}</strong><span>Total articles</span></div><div><strong>{articles.filter(a=>a.status==='draft').length}</strong><span>Drafts</span></div><div><strong>{articles.filter(a=>a.status==='review').length}</strong><span>In review</span></div><div><strong>{articles.filter(a=>a.status==='published').length}</strong><span>Published</span></div></div>
    <div className="admin-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Article library</button><button className={tab==='new'?'active':''} onClick={()=>setTab('new')}>＋ New article</button></div>
    {tab==='overview' ? <div className="admin-panel"><div className="admin-panel-head"><h2>Recent articles</h2><button className="button" onClick={()=>setTab('new')}>Create article</button></div>{articles.length===0?<div className="admin-empty">No CMS articles yet. Create your first draft.</div>:<div className="admin-table"><div className="admin-row admin-row-header"><span>Article</span><span>Status</span><span>Created</span></div>{articles.map(a=><div className="admin-row" key={a.id}><span><strong>{a.title}</strong><small>/{a.slug}</small></span><span><i className={'status-pill '+a.status}>{a.status}</i></span><span>{new Date(a.created_at).toLocaleDateString()}</span></div>)}</div>}</div>
    : <div className="admin-panel"><h2>Create article</h2><form className="admin-article-form" onSubmit={saveArticle}><label>Article title<input value={title} onChange={e=>{setTitle(e.target.value); if(!slug) setSlug(makeSlug(e.target.value));}} required/></label><label>Slug<input value={slug} onChange={e=>setSlug(makeSlug(e.target.value))} required/></label><label>Short summary<textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)} required/></label><label>Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)} required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Content paragraphs<textarea rows={12} placeholder="Write the article. Separate paragraphs with a blank line." value={body} onChange={e=>setBody(e.target.value)} required/></label><label>Initial status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Draft</option><option value="review">Submit for review</option></select></label><div className="admin-actions"><button type="button" className="admin-secondary" onClick={()=>setTab('overview')}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving?'Saving…':'Save article'}</button></div>{error&&<p className="admin-error">{error}</p>}</form></div>}
  </div>;
}
