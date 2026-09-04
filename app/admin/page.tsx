'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ExternalLink, PlusCircle, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { ReceiptData } from '@/components/DigitalReceipt';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  // Check auth session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth');
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setLoginError(data.error || 'Invalid password. Access denied.');
      }
    } catch (err: any) {
      setLoginError('Authentication error: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/receipts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReceipts(data.receipts);
      }
    } catch (err) {
      console.error('Error fetching admin receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReceipts();
    }
  }, [isAuthenticated, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts();
  };

  // Direct Bank Verification for an item from Admin Dashboard
  const handleVerifyBankItem = async (receiptNo: string) => {
    setVerifyingId(receiptNo);
    setReconcileNotice(null);
    try {
      const res = await fetch(`/api/receipts/${receiptNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_bank' })
      });
      const data = await res.json();
      if (data.success) {
        setReconcileNotice(`Receipt ${receiptNo} successfully verified directly with the bank!`);
        fetchReceipts();
      } else {
        setReconcileNotice(`Bank verification notice for ${receiptNo}: ${data.message || 'Could not verify'}`);
      }
    } catch (err: any) {
      setReconcileNotice(`Verification failed: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  // Bulk Bank Reconciliation
  const handleBulkReconcileAll = async () => {
    const pendingList = receipts.filter(r => r.verification_status !== 'VERIFIED' && r.transaction_id);
    if (pendingList.length === 0) {
      setReconcileNotice('No pending receipts with UTRs to reconcile.');
      return;
    }

    setLoading(true);
    let verifiedCount = 0;
    for (const item of pendingList) {
      try {
        const res = await fetch(`/api/receipts/${item.receipt_no}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify_bank' })
        });
        const data = await res.json();
        if (data.success) verifiedCount++;
      } catch {
        // continue
      }
    }
    setReconcileNotice(`Bulk bank reconciliation completed: ${verifiedCount} of ${pendingList.length} receipts verified!`);
    fetchReceipts();
  };

  // Calculations
  const totalCollected = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalVerifiedCount = receipts.filter(r => r.verification_status === 'VERIFIED').length;
  const totalPendingCount = receipts.filter(r => r.verification_status !== 'VERIFIED').length;

  // 1. Checking auth state
  if (isAuthenticated === null) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ color: 'var(--muted)' }}>Checking authorization...</p>
      </div>
    );
  }

  // 2. Not Authenticated: Render Password Protection Login Screen
  if (!isAuthenticated) {
    return (
      <div className="adminLoginWrapper">
        <div className="adminLoginCard">
          <div className="adminLoginHeader">
            <img
              src="/ypf-logo.png"
              alt="Youth Peace Foundation"
              style={{ width: '220px', height: 'auto', margin: '0 auto 18px', display: 'block' }}
            />
            <div className="lockIconCircle">
              <Lock size={24} />
            </div>
            <span className="sectionEyebrow">RESTRICTED PORTAL</span>
            <h2>Admin Authentication</h2>
            <p>Please enter the administrative password to access receipts, accounting registers, and bank reconciliation.</p>
          </div>

          {loginError && (
            <div className="formErrorAlert">
              <AlertTriangle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="adminLoginForm">
            <div className="field">
              <label htmlFor="adminPassword">Admin Password</label>
              <input
                id="adminPassword"
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
                style={{ padding: '14px', fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn submitBtn"
              style={{ marginTop: '20px' }}
            >
              {isLoggingIn ? 'Authenticating...' : 'Unlock Admin Portal'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
              ← Return to Receipt Generator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render Full Dashboard
  return (
    <div className="adminDashboard container">
      {/* Top Banner */}
      <div className="adminTopBar">
        <div>
          <span className="sectionEyebrow">ADMINISTRATION &amp; ACCOUNTS</span>
          <h1>Donations &amp; Receipts Register</h1>
          <p className="muted">
            Live database of all donor receipts. Download full Excel spreadsheets and reconcile with bank accounts.
          </p>
        </div>

        <div className="adminActionButtons">
          <Link href="/" className="btn secondary">
            <PlusCircle size={16} /> New Receipt
          </Link>
          <a
            href="/api/export-excel"
            download
            className="btn excelDownloadBtn"
          >
            <Download size={16} /> Download Excel (.xlsx)
          </a>
          <button
            onClick={handleLogout}
            className="btn secondary logoutBtn"
            title="Log out of Admin Portal"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="statsGrid">
        <div className="statCard">
          <span className="statLabel">Total Donations (₹)</span>
          <strong className="statValue">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
          <span className="statSub">Across all issued receipts</span>
        </div>

        <div className="statCard">
          <span className="statLabel">Total Receipts</span>
          <strong className="statValue">{receipts.length}</strong>
          <span className="statSub">Sequential Unique IDs</span>
        </div>

        <div className="statCard borderVerified">
          <span className="statLabel">Bank Verified</span>
          <strong className="statValue textVerified">{totalVerifiedCount}</strong>
          <span className="statSub">Settled &amp; matched with bank ledger</span>
        </div>

        <div className="statCard borderPending">
          <span className="statLabel">Pending Bank Settlement</span>
          <strong className="statValue textPending">{totalPendingCount}</strong>
          <span className="statSub">Awaiting UTR reconciliation</span>
        </div>
      </div>

      {reconcileNotice && (
        <div className="bankNoticeBanner">
          <ShieldCheck size={18} />
          <span>{reconcileNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="adminFilterBar">
        <form onSubmit={handleSearchSubmit} className="adminSearchForm">
          <div className="searchField">
            <Search size={18} className="searchIcon" />
            <input
              type="text"
              placeholder="Search by Donor Name, Receipt No, UTR, District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn secondary">Search</button>
        </form>

        <div className="filterControls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="statusSelect"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Only</option>
          </select>

          <button
            onClick={handleBulkReconcileAll}
            className="btn gold"
            title="Auto-match all pending UTRs against bank statements"
          >
            <ShieldCheck size={16} /> Bulk Verify with Bank
          </button>

          <button
            onClick={fetchReceipts}
            className="btn secondary refreshBtn"
            title="Refresh Table"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="tableCard">
        <div className="tablewrap">
          {loading ? (
            <div className="tableLoading">Loading contribution records...</div>
          ) : receipts.length === 0 ? (
            <div className="tableEmpty">No receipts found. Generate a receipt to see it here!</div>
          ) : (
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Date</th>
                  <th>Donor Name</th>
                  <th>Contact</th>
                  <th>District / AC</th>
                  <th>Amount (₹)</th>
                  <th>Mode / UTR</th>
                  <th>Bank Status</th>
                  <th>Bank Ref / Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
                  const isVer = r.verification_status === 'VERIFIED';
                  return (
                    <tr key={r.receipt_no}>
                      <td>
                        <strong className="cellReceiptNo">{r.receipt_no}</strong>
                        <div className="cellId">ID #{r.contribution_id}</div>
                      </td>
                      <td>{r.date}</td>
                      <td>
                        <strong>{r.contributor_name}</strong>
                        {r.pan_aadhaar && <div className="cellSub">PAN: {r.pan_aadhaar}</div>}
                      </td>
                      <td>{r.contact_no}</td>
                      <td>
                        <div>{r.district}</div>
                        {r.ac && <span className="acBadge">{r.ac}</span>}
                      </td>
                      <td>
                        <strong className="cellAmount">
                          ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <div className="paymentBadge">{r.payment_mode}</div>
                        {r.transaction_id ? (
                          <div className="cellUtr" title="UTR">{r.transaction_id}</div>
                        ) : (
                          <div className="cellSub">No UTR</div>
                        )}
                      </td>
                      <td>
                        <span className={`statusPill ${isVer ? 'pillVerified' : 'pillPending'}`}>
                          {isVer ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          {r.verification_status}
                        </span>
                      </td>
                      <td>
                        {r.verification_reference && r.verification_reference !== '-' ? (
                          <div className="bankMeta">
                            <strong className="bankRefText">{r.verification_reference}</strong>
                            <div className="bankDateText">{r.bank_transaction_date}</div>
                          </div>
                        ) : (
                          <span className="cellSub">-</span>
                        )}
                      </td>
                      <td>
                        <div className="rowActions">
                          <Link
                            href={`/verify/${encodeURIComponent(r.receipt_no)}`}
                            target="_blank"
                            className="viewReceiptBtn"
                            title="View / Print Digital Receipt"
                          >
                            <ExternalLink size={14} /> Receipt
                          </Link>
                          {!isVer && r.transaction_id && (
                            <button
                              onClick={() => handleVerifyBankItem(r.receipt_no)}
                              disabled={verifyingId === r.receipt_no}
                              className="tableVerifyBtn"
                              title="Cross-check amount with bank"
                            >
                              {verifyingId === r.receipt_no ? 'Checking...' : 'Verify Bank'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
