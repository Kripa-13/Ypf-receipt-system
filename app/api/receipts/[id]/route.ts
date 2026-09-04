import { NextResponse } from 'next/server';
import { ensureDbInitialized, ReceiptRecord } from '@/lib/db';
import { verifyTransactionWithBank } from '@/lib/bank-verifier';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idOrNo = decodeURIComponent(params.id);
    const db = await ensureDbInitialized();

    let res;
    if (/^\d+$/.test(idOrNo)) {
      res = await db.execute({
        sql: 'SELECT * FROM receipts WHERE id = ? OR contribution_id = ?',
        args: [parseInt(idOrNo, 10), parseInt(idOrNo, 10)]
      });
    } else {
      res = await db.execute({
        sql: 'SELECT * FROM receipts WHERE receipt_no = ?',
        args: [idOrNo]
      });
    }

    const receipt = res.rows[0];
    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, receipt });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idOrNo = decodeURIComponent(params.id);
    const db = await ensureDbInitialized();

    let queryRes;
    if (/^\d+$/.test(idOrNo)) {
      queryRes = await db.execute({
        sql: 'SELECT * FROM receipts WHERE id = ? OR contribution_id = ?',
        args: [parseInt(idOrNo, 10), parseInt(idOrNo, 10)]
      });
    } else {
      queryRes = await db.execute({
        sql: 'SELECT * FROM receipts WHERE receipt_no = ?',
        args: [idOrNo]
      });
    }

    const receipt = queryRes.rows[0] as unknown as ReceiptRecord;
    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'verify_bank') {
      if (!receipt.transaction_id) {
        return NextResponse.json({
          success: false,
          error: 'No Transaction ID / UTR provided for this receipt'
        }, { status: 400 });
      }

      const bankResult = await verifyTransactionWithBank(receipt.transaction_id, Number(receipt.amount));

      if (bankResult.success && bankResult.status === 'VERIFIED') {
        const dateVal = bankResult.creditTimestamp || new Date().toLocaleString('en-IN');
        const refVal = bankResult.bankAuthRef || `VERIF-${receipt.transaction_id}`;

        await db.execute({
          sql: `
            UPDATE receipts
            SET verification_status = 'VERIFIED',
                bank_transaction_date = ?,
                verification_reference = ?
            WHERE id = ?
          `,
          args: [dateVal, refVal, receipt.id]
        });

        const updatedRes = await db.execute({
          sql: 'SELECT * FROM receipts WHERE id = ?',
          args: [receipt.id]
        });

        return NextResponse.json({
          success: true,
          message: bankResult.message,
          receipt: updatedRes.rows[0],
          bankResult
        });
      } else {
        return NextResponse.json({
          success: false,
          status: bankResult.status,
          message: bankResult.message,
          bankResult
        }, { status: 422 });
      }
    }

    return NextResponse.json({ success: true, receipt });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
