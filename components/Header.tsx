'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Search, Moon, Sun, X } from 'lucide-react';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem('mifask-theme'); if (saved === 'dark' || saved === 'light') { setDark(saved === 'dark'); document.documentElement.dataset.theme = saved; } }
    catch { /* Theme preference storage is optional. */ }
  }, []);
  function toggleTheme() { setDark((v) => { const next = !v; document.documentElement.dataset.theme = next ? 'dark' : 'light'; try { localStorage.setItem('mifask-theme', next ? 'dark' : 'light'); } catch { /* Continue without persistence. */ } return next; }); }
  const closeMenu = () => setOpen(false);
  return <header className="header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="Mifask Islamic Encyclopedia home" onClick={closeMenu}><span className="brand-mark" aria-hidden="true">م</span><span><strong>MIFASK</strong><small>ISLAMIC ENCYCLOPEDIA</small></span></Link>
    <nav id="primary-navigation" aria-label="Primary navigation" className={'nav ' + (open ? 'nav-open' : '')}>
      <Link href="/" onClick={closeMenu}>Home</Link>
      <details className="nav-group" onMouseEnter={(e)=>{if(window.matchMedia("(hover:hover)").matches)e.currentTarget.open=true;}} onMouseLeave={(e)=>{e.currentTarget.open=false;}} onMouseEnter={(e)=>{if(window.matchMedia("(hover:hover)").matches)e.currentTarget.open=true;}} onMouseLeave={(e)=>{e.currentTarget.open=false;}}><summary>Study</summary><div className="nav-submenu"><Link href="/explore" onClick={closeMenu}>Explore</Link><Link href="/learn" onClick={closeMenu}>Learn</Link><Link href="/assistant" onClick={closeMenu}>Study Assistant</Link><Link href="/search" onClick={closeMenu}>Advanced Search</Link><Link href="/dictionary" onClick={closeMenu}>Dictionary</Link><Link href="/knowledge-graph" onClick={closeMenu}>Knowledge Graph</Link><Link href="/saved" onClick={closeMenu}>Saved</Link></div></details>
      <details className="nav-group" onMouseEnter={(e)=>{if(window.matchMedia("(hover:hover)").matches)e.currentTarget.open=true;}} onMouseLeave={(e)=>{e.currentTarget.open=false;}}><summary>Qur’an & Hadith</summary><div className="nav-submenu"><Link href="/quran" onClick={closeMenu}>Qur’an Reader</Link><Link href="/category/quran" onClick={closeMenu}>Qur’an Topics</Link><Link href="/hadith" onClick={closeMenu}>Hadith</Link><Link href="/hadith/library" onClick={closeMenu}>Hadith Library</Link><Link href="/duas" onClick={closeMenu}>Duas</Link></div></details>
      <details className="nav-group" onMouseEnter={(e)=>{if(window.matchMedia("(hover:hover)").matches)e.currentTarget.open=true;}} onMouseLeave={(e)=>{e.currentTarget.open=false;}}><summary>History</summary><div className="nav-submenu"><Link href="/category/prophets" onClick={closeMenu}>Prophets</Link><Link href="/companions" onClick={closeMenu}>Companions</Link><Link href="/seerah" onClick={closeMenu}>Seerah</Link><Link href="/category/fiqh" onClick={closeMenu}>Fiqh</Link></div></details>
      <Link href="/gallery" onClick={closeMenu}>Gallery</Link>
    </nav>
    <div className="header-actions"><Link className="search-shortcut" href="/search" aria-label="Open search"><Search size={17}/><span>Search</span></Link><button type="button" className="icon-button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark} onClick={toggleTheme}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button type="button" className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="primary-navigation">{open ? <X size={19}/> : <Menu size={19}/>}</button></div>
  </div></header>;
}
