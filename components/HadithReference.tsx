import Link from 'next/link';
import type { ReactNode } from 'react';

const collections=[
 {patterns:[/sahih al[- ]?bukhari/i,/al[- ]?bukhari/i,/bukhari/i],slug:'bukhari',name:'Sahih al-Bukhari'},
 {patterns:[/sahih muslim/i,/muslim/i],slug:'muslim',name:'Sahih Muslim'},
 {patterns:[/sunan abi dawud/i,/abu dawud/i,/ab[uū] daw[uū]d/i],slug:'abudawud',name:'Sunan Abi Dawud'},
 {patterns:[/jami[ʿ']?\s*al[- ]?tirmidhi/i,/tirmidhi/i],slug:'tirmidhi',name:'Jamiʿ al-Tirmidhi'},
 {patterns:[/sunan al[- ]?nasai/i,/al[- ]?nasai/i,/nasa[’']?i/i],slug:'nasai',name:'Sunan al-Nasa’i'},
 {patterns:[/sunan ibn majah/i,/ibn majah/i],slug:'ibnmajah',name:'Sunan Ibn Majah'},
 {patterns:[/muwatta[’']? malik/i,/malik/i],slug:'malik',name:'Muwattaʾ Malik'},
 {patterns:[/riyad as[- ]?salihin/i,/riyadh.*salihin/i],slug:'riyad',name:'Riyad as-Salihin'},
];
export default function HadithReference({reference,fallback}:{reference:string;fallback?:ReactNode}){
 const collection=collections.find(c=>c.patterns.some(p=>p.test(reference)));
 if(!collection)return <>{fallback}</>;
 return <Link className="hadith-reference-link" href={`/hadith/library/${collection.slug}`} title={`Open ${collection.name} in MIFASK Hadith reader`}>{reference} ↗</Link>;
}
