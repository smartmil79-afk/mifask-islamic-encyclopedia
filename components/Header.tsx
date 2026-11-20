'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, Search, Moon, Sun, X } from 'lucide-react';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  function toggleTheme() { setDark((v) => !v); document.documentElement.dataset.theme = dark ? 'light' : 'dark'; }
  return <header className="header"><div className="header-inner">
    <Link href="/" className="brand"><span className="brand-mark">م</span><span><strong>MIFASK</strong><small>ISLAMIC ENCYCLOPEDIA</small></span></Link>
    <nav className={`nav ${open ? 'nav-open' : ''}`}>
      <Link href="/">Home</Link><Link href="/explore">Explore</Link><Link href="/saved">Saved</Link><Link href="/category/quran">Qur’an</Link><Link href="/category/hadith">Hadith</Link><Link href="/category/prophets">Prophets</Link><Link href="/category/fiqh">Fiqh</Link>
    </nav>
    <div className="header-actions"><Link className="search-shortcut" href="/explore"><Search size={17}/><span>Search</span></Link><button className="icon-button" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X size={19}/> : <Menu size={19}/>}</button></div>
  </div></header>;
}
