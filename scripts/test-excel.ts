import { getDb, ReceiptRecord } from '../lib/db';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

function testExcelExport() {
  console.log('====================================================');
  console.log('📊 TESTING EXCEL EXPORT (XLSX SPREADSHEET GENERATION)');
  console.log('====================================================\n');

  const db = getDb();
  const rows = db.prepare('SELECT * FROM receipts ORDER BY contribution_id ASC').all() as ReceiptRecord[];

  console.log(`Found ${rows.length} records in receipts database.`);

  const excelData = rows.map((r, index) => ({
    'S.No': index + 1,
    'Receipt No': r.receipt_no,
    'Contribution ID': r.contribution_id,
    'Date': r.date,
    'AC Code': r.ac || '-',
    'Contributor Name': r.contributor_name,
    'Contact No': r.contact_no,
    'Address': r.address || '-',
    'District': r.district,
    'PIN Code': r.pin_code,
    'PAN / Aadhaar': r.pan_aadhaar || '-',
    'Contribution Amount (₹)': r.amount,
    'Amount in Words': r.amount_words,
    'Payment Mode': r.payment_mode,
    'Transaction ID / UTR': r.transaction_id || '-',
    'Bank Verification Status': r.verification_status,
    'Bank Transaction Date': r.bank_transaction_date || '-',
    'Bank Verification Ref': r.verification_reference || '-',
    'Receiver Name': r.receiver_name,
    'Registered At': r.created_at
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'YPF Contributions');

  const outputPath = path.join(__dirname, 'test_export.xlsx');
  XLSX.writeFile(workbook, outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`✅ Excel file generated successfully!`);
  console.log(`   File: ${outputPath}`);
  console.log(`   Size: ${stats.size} bytes`);
  console.log(`   Total Data Rows: ${excelData.length}`);

  // Clean up test file
  fs.unlinkSync(outputPath);
  console.log('\n🎉 PASS: Excel Export verification passed successfully!');
}

testExcelExport();
