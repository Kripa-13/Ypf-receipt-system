import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Youth Peace Foundation | Digital Receipt System',
  description: 'Official Digital Contribution Receipt & Bank Verification System for Youth Peace Foundation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="top no-print">
            <div className="brand">
              <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/ypf-logo.png"
                  alt="Youth Peace Foundation Logo"
                  style={{ height: '36px', background: 'white', padding: '3px 10px', borderRadius: '8px', objectFit: 'contain' }}
                />
              </Link>
            </div>

            <nav>
              <Link href="/">New Receipt</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
