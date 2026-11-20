import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export const metadata: Metadata = { title: 'Mifask Islamic Encyclopedia', description: 'A comprehensive digital repository of Islamic knowledge — Qur’an, Hadith, Prophets, history, teachings and Muslim life.', applicationName: 'Mifask Islamic Encyclopedia' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>; }
