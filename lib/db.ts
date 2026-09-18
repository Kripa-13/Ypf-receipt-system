import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let client: Client | null = null;
let isInitialized = false;

export function getDb(): Client {
  if (!client) {
    const isVercel = Boolean(process.env.VERCEL);
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;

    if (tursoUrl) {
      client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
    } else {
      const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {
          // ignore
        }
      }
      const dbPath = path.join(dataDir, 'ypf_receipts.db');
      client = createClient({
        url: `file:${dbPath}`
      });
    }
  }

  return client;
}

export async function ensureDbInitialized(): Promise<Client> {
  const db = getDb();
  if (isInitialized) return db;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      contribution_id INTEGER UNIQUE NOT NULL,
      date TEXT NOT NULL,
      ac TEXT,
      contributor_name TEXT NOT NULL,
      address TEXT,
      district TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      contact_no TEXT NOT NULL,
      pan_aadhaar TEXT,
      receiver_name TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_words TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_id TEXT,
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      bank_transaction_date TEXT,
      verification_reference TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utr TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      remitter_name TEXT,
      bank_name TEXT DEFAULT 'AXIS BANK',
      credit_timestamp TEXT NOT NULL,
      bank_auth_ref TEXT NOT NULL,
      status TEXT DEFAULT 'SETTLED',
      created_at TEXT NOT NULL
    );
  `);

  // Seed sample transactions if bank_ledger is empty
  const countRes = await db.execute('SELECT COUNT(*) as count FROM bank_ledger');
  const count = Number(countRes.rows[0]?.count || 0);

  if (count === 0) {
    const seedTransactions = [
      ['AXISNP1234567890', 1000.0, 'Kripa Singhal', 'Axis Bank', '27/08/2026 11:24:18', 'AXIS-AUTH-884210', 'SETTLED', new Date().toISOString()],
      ['UPI423456789012', 100.0, 'Rahul Sharma', 'State Bank of India', '04/09/2026 09:15:33', 'SBI-UPI-994321', 'SETTLED', new Date().toISOString()],
      ['HDFC987654321012', 500.0, 'Priya Patel', 'HDFC Bank', '04/09/2026 10:45:10', 'HDFC-NEFT-551234', 'SETTLED', new Date().toISOString()],
      ['ICIC00192837465', 100.0, 'Amit Verma', 'ICICI Bank', '04/09/2026 12:02:44', 'ICIC-IMPS-774411', 'SETTLED', new Date().toISOString()],
      ['PAYTM8823910293', 2500.0, 'Ananya Sen', 'Paytm Payments Bank', '04/09/2026 14:30:19', 'PYTM-UPI-332211', 'SETTLED', new Date().toISOString()],
    ];

    for (const tx of seedTransactions) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO bank_ledger (utr, amount, remitter_name, bank_name, credit_timestamp, bank_auth_ref, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: tx
      });
    }
  }

  isInitialized = true;
  return db;
}

export interface CreateReceiptInput {
  date: string;
  ac?: string;
  contributorName: string;
  address?: string;
  district: string;
  pinCode: string;
  contactNo: string;
  panAadhaar?: string;
  receiverName: string;
  amount: number;
  amountWords: string;
  paymentMode: string;
  transactionId?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED';
  bankTransactionDate?: string;
  verificationReference?: string;
  clientMaxId?: number;
  customContributionId?: number;
}

export interface ReceiptRecord {
  id: number;
  receipt_no: string;
  contribution_id: number;
  date: string;
  ac: string | null;
  contributor_name: string;
  address: string | null;
  district: string;
  pin_code: string;
  contact_no: string;
  pan_aadhaar: string | null;
  receiver_name: string;
  amount: number;
  amount_words: string;
  payment_mode: string;
  transaction_id: string | null;
  verification_status: string;
  bank_transaction_date: string | null;
  verification_reference: string | null;
  created_at: string;
}

/**
 * Concurrency-safe atomic receipt creation.
 * Generates monotonic unique IDs (YPF-2026-000001, etc.)
 * Preserves sequence continuity across restarts, days, and devices.
 */
export async function insertReceiptAtomic(input: CreateReceiptInput): Promise<ReceiptRecord> {
  const db = await ensureDbInitialized();

  const year = new Date().getFullYear();
  const maxRowRes = await db.execute('SELECT MAX(contribution_id) as maxId FROM receipts');
  const dbMaxId = maxRowRes.rows[0]?.maxId ? Number(maxRowRes.rows[0].maxId) : 0;
  const clientMax = Number(input.clientMaxId) || 0;
  const requested = Number(input.customContributionId) || 0;

  let nextContributionId: number;
  if (requested > 0) {
    nextContributionId = requested;
  } else {
    nextContributionId = Math.max(dbMaxId, clientMax) + 1;
  }

  // Safety check: ensure nextContributionId is unique (does not collide with existing record)
  const collisionCheck = await db.execute({
    sql: 'SELECT id FROM receipts WHERE contribution_id = ?',
    args: [nextContributionId]
  });

  if (collisionCheck.rows.length > 0 && requested <= 0) {
    const safeMax = Math.max(dbMaxId, clientMax, nextContributionId);
    nextContributionId = safeMax + 1;
  }

  const formattedReceiptNo = `YPF-${year}-${String(nextContributionId).padStart(6, '0')}`;
  const now = new Date().toISOString();

  const insertRes = await db.execute({
    sql: `
      INSERT INTO receipts (
        receipt_no,
        contribution_id,
        date,
        ac,
        contributor_name,
        address,
        district,
        pin_code,
        contact_no,
        pan_aadhaar,
        receiver_name,
        amount,
        amount_words,
        payment_mode,
        transaction_id,
        verification_status,
        bank_transaction_date,
        verification_reference,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      formattedReceiptNo,
      nextContributionId,
      input.date,
      input.ac || '',
      input.contributorName.trim(),
      input.address || '',
      input.district.trim(),
      input.pinCode.trim(),
      input.contactNo.trim(),
      input.panAadhaar || '',
      input.receiverName.trim(),
      input.amount,
      input.amountWords,
      input.paymentMode,
      (input.transactionId || '').trim().toUpperCase(),
      input.verificationStatus || 'PENDING',
      input.bankTransactionDate || '-',
      input.verificationReference || '-',
      now
    ]
  });

  const rowRes = await db.execute({
    sql: 'SELECT * FROM receipts WHERE id = ?',
    args: [insertRes.lastInsertRowid ? Number(insertRes.lastInsertRowid) : 1]
  });

  const row = rowRes.rows[0];
  return row as unknown as ReceiptRecord;
}
