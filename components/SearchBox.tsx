'use client';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
export default function SearchBox({ large = false, placeholder = 'Search Qur’an, Hadith, Prophets, topics…' }: {large?: boolean; placeholder?: string}) {
 const [query,setQuery]=useState(''); const router=useRouter();
 function submit(e: React.FormEvent){e.preventDefault();if(query.trim()){getSupabaseClient()?.rpc('ie_record_analytics',{event_kind:'search',article_slug:null});router.push(`/explore?q=${encodeURIComponent(query)}`)}}
 return <form onSubmit={submit} className={`search-box ${large?'search-large':''}`}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder} aria-label="Search Islamic knowledge"/><button type="submit">Search</button></form>
}
