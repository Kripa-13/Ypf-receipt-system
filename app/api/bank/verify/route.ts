import { NextResponse } from 'next/server';
import { verifyTransactionWithBank } from '@/lib/bank-verifier';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { utr, amount } = await request.json();

    if (!utr) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid Transaction ID / UTR'
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid contribution amount'
      }, { status: 400 });
    }

    const result = await verifyTransactionWithBank(utr, numAmount);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
