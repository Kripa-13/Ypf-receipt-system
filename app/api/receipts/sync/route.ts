import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.receipts)
      ? body.receipts
      : body.receipt_no
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'No receipts provided' }, { status: 400 });
    }

    const db = await ensureDbInitialized();
    let inserted = 0;

    for (const r of items) {
      const receiptNo = r.receipt_no || r.receiptNo;
      const contributionId = r.contribution_id || r.contributionId;
      if (!receiptNo || !contributionId) continue;

      const contributorName = r.contributor_name || r.contributorName || '';
      const contactNo = r.contact_no || r.contactNo || '';
      const district = r.district || '';
      const pinCode = r.pin_code || r.pinCode || '';
      const receiverName = r.receiver_name || r.receiverName || 'Youth Peace Foundation';
      const amount = Number(r.amount) || 0;
      const amountWords = r.amount_words || r.amountWords || '';
      const paymentMode = r.payment_mode || r.paymentMode || 'UPI';
      const transactionId = r.transaction_id || r.transactionId || null;
      const verificationStatus = r.verification_status || r.verificationStatus || 'PENDING';
      const bankTransactionDate = r.bank_transaction_date || r.bankTransactionDate || null;
      const verificationReference = r.verification_reference || r.verificationReference || null;
      const address = r.address || null;
      const panAadhaar = r.pan_aadhaar || r.panAadhaar || null;
      const ac = r.ac || '';

      await db.execute({
        sql: `
          INSERT OR IGNORE INTO receipts (
            receipt_no, contribution_id, date, ac, contributor_name,
            address, district, pin_code, contact_no, pan_aadhaar,
            receiver_name, amount, amount_words, payment_mode,
            transaction_id, verification_status, bank_transaction_date,
            verification_reference, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          receiptNo,
          Number(contributionId),
          r.date || new Date().toLocaleDateString('en-GB'),
          ac,
          contributorName,
          address,
          district,
          pinCode,
          contactNo,
          panAadhaar,
          receiverName,
          amount,
          amountWords,
          paymentMode,
          transactionId,
          verificationStatus,
          bankTransactionDate,
          verificationReference,
          r.created_at || new Date().toISOString()
        ]
      });
      inserted++;
    }

    return NextResponse.json({ success: true, synced: inserted });
  } catch (err: any) {
    console.error('Error syncing receipts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
