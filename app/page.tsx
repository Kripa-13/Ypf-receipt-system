'use client';

import React, { useState } from 'react';
import DonationForm from '@/components/DonationForm';
import DigitalReceipt, { ReceiptData } from '@/components/DigitalReceipt';
import Link from 'next/link';
import { ShieldCheck, FileSpreadsheet, PlusCircle } from 'lucide-react';

export default function Home() {
  const [generatedReceipt, setGeneratedReceipt] = useState<ReceiptData | null>(null);

  return (
    <main>
      <section className="contributionSection" id="create-receipt">
        <div className="sectionHeading">
          <div>
            <span className="sectionEyebrow">
              {generatedReceipt ? 'DIGITAL RECEIPT GENERATED' : 'NEW CONTRIBUTION'}
            </span>

            <h2>{generatedReceipt ? 'Official Digital Receipt' : 'Create a receipt'}</h2>

            <p>
              {generatedReceipt
                ? 'Your verified contribution receipt is ready. You can print, download as image, or verify bank status below.'
                : 'Enter the paper slip details below to generate a verified digital receipt.'}
            </p>
          </div>

          <div className="topActionsGroup no-print">
            <div className="secureLabel">
              <span>🔒</span>
              Concurrent Unique ID &amp; Bank Verified
            </div>
            <Link href="/admin" className="adminQuickBtn">
              <FileSpreadsheet size={15} /> Admin Excel Sheet
            </Link>
          </div>
        </div>

        <div className="formCard">
          {generatedReceipt ? (
            <DigitalReceipt
              receipt={generatedReceipt}
              onBack={() => setGeneratedReceipt(null)}
              onRefresh={(updated) => setGeneratedReceipt(updated)}
            />
          ) : (
            <DonationForm
              onSuccess={(receipt) => setGeneratedReceipt(receipt)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
