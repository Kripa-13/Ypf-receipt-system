import { NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const r = await request.json();
    if (!r.receipt_no || !r.contribution_id) {
      return NextResponse.json({ success: false, error: 'Invalid receipt' }, { status: 400 });
    }

    const db = await ensureDbInitialized();
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO receipts (
          receipt_no, contribution_id, date, contributor_name,
          address, district, pin_code, contact_no, pan_aadhaar,
          receiver_name, amount, amount_words, payment_mode,
          transaction_id, verification_status, bank_transaction_date,
          verification_reference, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        r.receipt_no,
        r.contribution_id,
        r.date,
        r.contributor_name,
        r.address || null,
        r.district,
        r.pin_code,
        r.contact_no,
        r.pan_aadhaar || null,
        r.receiver_name,
        r.amount,
        r.amount_words,
        r.payment_mode,
        r.transaction_id || null,
        r.verification_status || 'PENDING',
        r.bank_transaction_date || null,
        r.verification_reference || null,
        new Date().toISOString()
      ]
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error syncing receipt:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
