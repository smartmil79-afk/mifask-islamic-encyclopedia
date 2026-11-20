'use client';
import { useEffect } from 'react';
import Link from 'next/link';
export default function ErrorBoundary({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{console.error('Mifask route error:',error);},[error]);
  return <div className="page-shell"><section className="app-error-state" role="alert"><span className="section-kicker">Something went wrong</span><h1>We couldn’t load this page</h1><p>Your session and saved items remain untouched. Please try again, or return to the encyclopedia home.</p><div className="app-error-actions"><button className="button" type="button" onClick={reset}>Try again</button><Link className="button button-outline" href="/">Home</Link></div>{error.digest&&<small>Reference: {error.digest}</small>}</section></div>;
}
