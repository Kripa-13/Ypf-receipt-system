import { NextResponse } from 'next/server';
import { ensureDbInitialized, insertReceiptAtomic, CreateReceiptInput, ReceiptRecord } from '@/lib/db';
import { amountToIndianWords } from '@/lib/number-to-words';
import { verifyTransactionWithBank } from '@/lib/bank-verifier';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const ac = searchParams.get('ac') || '';

    const db = await ensureDbInitialized();
    let query = 'SELECT * FROM receipts WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      query += ` AND (
        receipt_no LIKE ? OR
        contributor_name LIKE ? OR
        contact_no LIKE ? OR
        transaction_id LIKE ? OR
        district LIKE ?
      )`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (status) {
      query += ' AND verification_status = ?';
      params.push(status);
    }

    if (ac) {
      query += ' AND ac LIKE ?';
      params.push(`%${ac}%`);
    }

    query += ' ORDER BY contribution_id DESC';

    const res = await db.execute({
      sql: query,
      args: params
    });

    return NextResponse.json({
      success: true,
      count: res.rows.length,
      receipts: res.rows as unknown as ReceiptRecord[]
    });
  } catch (err: any) {
    console.error('Error fetching receipts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      date,
      ac,
      contributorName,
      address,
      district,
      pinCode,
      contactNo,
      panAadhaar,
      receiverName,
      amount,
      paymentMode,
      transactionId,
      autoVerifyBank
    } = body;

    // Basic validation
    if (!contributorName || !district || !pinCode || !contactNo || !receiverName || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields (Name, District, PIN, Contact, Receiver, Amount)' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid contribution amount' }, { status: 400 });
    }

    const amountWords = amountToIndianWords(numAmount);

    let verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED' = 'PENDING';
    let bankTransactionDate = '-';
    let verificationReference = '-';

    // Direct bank verification if UTR provided
    if (transactionId) {
      const bankResult = await verifyTransactionWithBank(transactionId, numAmount);
      if (bankResult.success && bankResult.status === 'VERIFIED') {
        verificationStatus = 'VERIFIED';
        bankTransactionDate = bankResult.creditTimestamp || new Date().toLocaleString('en-IN');
        verificationReference = bankResult.bankAuthRef || `VERIF-${transactionId}`;
      } else if (autoVerifyBank && bankResult.status === 'AMOUNT_MISMATCH') {
        verificationStatus = 'FAILED';
        verificationReference = 'AMOUNT_MISMATCH';
      }
    }

    const receiptInput: CreateReceiptInput = {
      date: date || new Date().toLocaleDateString('en-GB'),
      ac: ac || '',
      contributorName,
      address: address || '',
      district,
      pinCode,
      contactNo,
      panAadhaar: panAadhaar || '',
      receiverName,
      amount: numAmount,
      amountWords,
      paymentMode: paymentMode || 'UPI',
      transactionId: transactionId || '',
      verificationStatus,
      bankTransactionDate,
      verificationReference
    };

    const receipt = await insertReceiptAtomic(receiptInput);

    return NextResponse.json({
      success: true,
      receipt,
      message: 'Receipt generated successfully'
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating receipt:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
