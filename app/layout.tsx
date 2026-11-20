import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export const metadata: Metadata = {
  title: { default: 'Mifask Islamic Encyclopedia', template: '%s | Mifask Islamic Encyclopedia' },
  description: 'A comprehensive digital repository of Islamic knowledge — Qur’an, Hadith, Prophets, history, teachings and Muslim life.',
  applicationName: 'Mifask Islamic Encyclopedia',
  metadataBase: new URL('https://mifask-islamic-encyclopedia-liha.vercel.app'),
  openGraph: { title: 'Mifask Islamic Encyclopedia', description: 'Explore Islamic knowledge with context, references and connected learning.', type: 'website' },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a><Header/><main id="main-content" tabIndex={-1}>{children}</main><Footer/></body></html>; }
