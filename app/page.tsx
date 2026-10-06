'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="splash-root">
      <div className="splash-logo-wrap">
        <svg className="splash-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="splash-brand">BillEasy</div>
        <div className="splash-tagline">Simple Billing<br/>For Smarter Business</div>
      </div>
      <div className="splash-loading">
        <div className="splash-loading-bar">
          <div className="splash-loading-fill" />
        </div>
        <span className="splash-loading-text">Loading...</span>
      </div>
    </div>
  );
}
