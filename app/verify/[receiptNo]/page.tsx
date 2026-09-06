'use client';

import React, { useEffect, useState, Suspense } from 'react';
import DigitalReceipt, { ReceiptData } from '@/components/DigitalReceipt';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { decodeReceiptToken } from '@/lib/receipt-token';

function VerifyReceiptContent({ receiptNo }: { receiptNo: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('t') || searchParams.get('token');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      // 1. Try querying the database API first
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(receiptNo)}`);
        const data = await res.json();
        if (data.success && data.receipt) {
          setReceipt(data.receipt);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Database fetch attempt failed, checking fallback token:', err);
      }

      // 2. If not found in this serverless container's DB, fallback to decoded QR token
      if (token) {
        const decoded = decodeReceiptToken(token);
        if (decoded) {
          setReceipt(decoded);
          setLoading(false);

          // Asynchronously sync back to database so future direct lookups find it
          fetch('/api/receipts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(decoded)
          }).catch(e => console.error('Sync failed:', e));
          return;
        }
      }

      setError('Receipt not found in official records');
      setLoading(false);
    }

    loadReceipt();
  }, [receiptNo, token]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Loading Official Receipt from Youth Peace Foundation...</h2>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ border: '1px solid #fca5a5', background: '#fef2f2' }}>
          <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#991b1b', margin: '0 0 10px' }}>Receipt Not Found</h2>
          <p style={{ color: '#7f1d1d' }}>{error}</p>
          <div style={{ marginTop: '20px' }}>
            <Link href="/" className="btn">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div className="verificationBanner no-print">
        <div className="verBannerLeft">
          <ShieldCheck size={28} className="shieldIcon" />
          <div>
            <strong>Official Youth Peace Foundation Digital Receipt</strong>
            <p>Officially recorded in the register with Unique Sequence ID #{receipt.contribution_id}.</p>
          </div>
        </div>
        <Link href="/" className="btn secondary">
          <ArrowLeft size={16} /> New Receipt
        </Link>
      </div>

      <div className="formCard" style={{ marginTop: '20px' }}>
        <DigitalReceipt
          receipt={receipt}
          onRefresh={(updated) => setReceipt(updated)}
        />
      </div>
    </div>
  );
}

export default function VerifyReceiptPage({ params }: { params: { receiptNo: string } }) {
  return (
    <Suspense fallback={
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Verifying Receipt authenticity with Youth Peace Foundation...</h2>
      </div>
    }>
      <VerifyReceiptContent receiptNo={params.receiptNo} />
    </Suspense>
  );
}
