'use client';

import React, { useEffect, useState } from 'react';
import DigitalReceipt, { ReceiptData } from '@/components/DigitalReceipt';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function VerifyReceiptPage({ params }: { params: { receiptNo: string } }) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(params.receiptNo)}`);
        const data = await res.json();
        if (data.success && data.receipt) {
          setReceipt(data.receipt);
        } else {
          setError(data.error || 'Receipt not found in the official records');
        }
      } catch (err: any) {
        setError('Error verifying receipt: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReceipt();
  }, [params.receiptNo]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Verifying Receipt authenticity with Youth Peace Foundation...</h2>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ border: '1px solid #fca5a5', background: '#fef2f2' }}>
          <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#991b1b', margin: '0 0 10px' }}>Receipt Verification Unsuccessful</h2>
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
            <strong>Authentic Youth Peace Foundation Digital Receipt</strong>
            <p>This receipt was officially recorded in the digital register with Unique Sequence ID #{receipt.contribution_id}.</p>
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
