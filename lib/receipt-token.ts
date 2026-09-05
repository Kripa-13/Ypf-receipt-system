import { ReceiptData } from '@/components/DigitalReceipt';

export interface CompactReceiptPayload {
  r: string;   // receipt_no
  id: number;  // contribution_id
  d: string;   // date
  n: string;   // contributor_name
  c: string;   // contact_no
  a?: string;  // address
  dt: string;  // district
  p: string;   // pin_code
  pan?: string;// pan_aadhaar
  rn: string;  // receiver_name
  amt: number; // amount
  w: string;   // amount_words
  m: string;   // payment_mode
  utr?: string;// transaction_id
  st: string;  // verification_status
  bdt?: string;// bank_transaction_date
  ref?: string;// verification_reference
}

export function encodeReceiptToken(r: ReceiptData): string {
  const compact: CompactReceiptPayload = {
    r: r.receipt_no,
    id: r.contribution_id,
    d: r.date,
    n: r.contributor_name,
    c: r.contact_no,
    a: r.address || '',
    dt: r.district,
    p: r.pin_code,
    pan: r.pan_aadhaar || '',
    rn: r.receiver_name,
    amt: r.amount,
    w: r.amount_words,
    m: r.payment_mode,
    utr: r.transaction_id || '',
    st: r.verification_status,
    bdt: r.bank_transaction_date || '-',
    ref: r.verification_reference || '-'
  };

  const json = JSON.stringify(compact);
  if (typeof window !== 'undefined') {
    try {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch {
      return Buffer.from(json).toString('base64url');
    }
  }
  return Buffer.from(json).toString('base64url');
}

export function decodeReceiptToken(token: string): ReceiptData | null {
  try {
    let json = '';
    if (typeof window !== 'undefined') {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      json = decodeURIComponent(escape(atob(base64)));
    } else {
      json = Buffer.from(token, 'base64url').toString('utf-8');
    }

    const c: CompactReceiptPayload = JSON.parse(json);
    if (!c.r || !c.id) return null;

    return {
      receipt_no: c.r,
      contribution_id: Number(c.id),
      date: c.d,
      contributor_name: c.n,
      contact_no: c.c,
      address: c.a || null,
      district: c.dt,
      pin_code: c.p,
      pan_aadhaar: c.pan || null,
      receiver_name: c.rn,
      amount: Number(c.amt),
      amount_words: c.w,
      payment_mode: c.m,
      transaction_id: c.utr || null,
      verification_status: c.st,
      bank_transaction_date: c.bdt || null,
      verification_reference: c.ref || null
    };
  } catch (err) {
    console.error('Failed to decode receipt token:', err);
    return null;
  }
}
