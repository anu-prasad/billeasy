import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'BillEasy — Simple Billing For Smarter Business',
  description: 'Multi-tenant billing software for shop owners. Create invoices, manage products, track sales and generate reports instantly.',
  keywords: 'billing software, invoice, GST, shop management, POS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
