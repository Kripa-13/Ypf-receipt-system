import { ReceiptData } from '@/components/DigitalReceipt';
import * as XLSX from 'xlsx';

export const STORAGE_KEY = 'ypf_receipts_storage_v1';

/**
 * Retrieve all receipts stored in the browser's localStorage.
 */
export function getLocalReceipts(): ReceiptData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read local receipts:', err);
    return [];
  }
}

/**
 * Save or update a receipt in localStorage.
 * Guaranteed to never duplicate records based on receipt_no.
 */
export function saveReceiptLocally(receipt: ReceiptData): void {
  if (typeof window === 'undefined' || !receipt || !receipt.receipt_no) return;
  try {
    const existing = getLocalReceipts();
    const index = existing.findIndex(r => r.receipt_no === receipt.receipt_no);
    let updated: ReceiptData[];

    if (index >= 0) {
      updated = [...existing];
      updated[index] = { ...updated[index], ...receipt };
    } else {
      updated = [receipt, ...existing];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save receipt locally:', err);
  }
}

/**
 * Merge receipts from the server and browser local storage.
 * Eliminates duplicates and sorts newest first by contribution_id.
 */
export function mergeReceipts(serverReceipts: ReceiptData[], localReceipts: ReceiptData[]): ReceiptData[] {
  const map = new Map<string, ReceiptData>();

  // 1. Add server receipts
  for (const r of serverReceipts) {
    if (r && r.receipt_no) {
      map.set(r.receipt_no, r);
    }
  }

  // 2. Merge local receipts (preserves locally created receipts if server instance restarted)
  for (const r of localReceipts) {
    if (r && r.receipt_no) {
      if (!map.has(r.receipt_no)) {
        map.set(r.receipt_no, r);
      }
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const idA = Number(a.contribution_id) || 0;
    const idB = Number(b.contribution_id) || 0;
    return idB - idA;
  });

  return merged;
}

/**
 * Background sync local receipts to the server database.
 */
export async function syncReceiptsWithServer(): Promise<{ synced: number; total: number }> {
  if (typeof window === 'undefined') return { synced: 0, total: 0 };
  const locals = getLocalReceipts();
  if (locals.length === 0) return { synced: 0, total: 0 };

  try {
    const res = await fetch('/api/receipts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipts: locals })
    });
    const data = await res.json();
    return { synced: data.synced || 0, total: locals.length };
  } catch (err) {
    console.warn('Sync attempt failed:', err);
    return { synced: 0, total: locals.length };
  }
}

/**
 * Export receipts directly to an Excel .xlsx workbook in the browser.
 */
export function exportReceiptsToExcel(receipts: ReceiptData[]): void {
  const excelData = receipts.map((r, index) => ({
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
    'Receiver Name': r.receiver_name
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 24 },
    { wch: 15 },
    { wch: 30 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'YPF Contributions');

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `YPF_Contributions_Register_${todayStr}.xlsx`);
}

/**
 * Export receipts as JSON backup file.
 */
export function exportReceiptsToJson(receipts: ReceiptData[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipts, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `YPF_Receipts_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
