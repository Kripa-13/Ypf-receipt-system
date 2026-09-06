import { NextResponse } from 'next/server';
import { ensureDbInitialized, ReceiptRecord } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await ensureDbInitialized();
    const res = await db.execute('SELECT * FROM receipts ORDER BY contribution_id ASC');
    const rows = res.rows as unknown as ReceiptRecord[];

    const excelData = rows.map((r, index) => ({
      'S.No': index + 1,
      'Receipt No': r.receipt_no,
      'Contribution ID': r.contribution_id,
      'Date': r.date,
      'Contributor Name': r.contributor_name,
      'Contact No': r.contact_no,
      'Address': r.address || '-',
      'District': r.district,
      'PIN Code': r.pin_code,
      'PAN / Aadhaar': r.pan_aadhaar || '-',
      'Contribution Amount (₹)': Number(r.amount),
      'Amount in Words': r.amount_words,
      'Payment Mode': r.payment_mode,
      'Transaction ID / UTR': r.transaction_id || '-',
      'Receiver Name': r.receiver_name,
      'Registered At': r.created_at
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const columnWidths = [
      { wch: 6 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 14 },
      { wch: 30 },
      { wch: 16 },
      { wch: 10 },
      { wch: 18 },
      { wch: 22 },
      { wch: 35 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 }
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'YPF Contributions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `YPF_Contributions_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('Error exporting Excel:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
