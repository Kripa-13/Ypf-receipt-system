'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Search, RefreshCw, PlusCircle, Lock, LogOut, Eye, EyeOff, ExternalLink } from 'lucide-react';
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
  }, [isAuthenticated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts();
  };

  // Calculations
  const totalCollected = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

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
      <div className="adminLoginWrapper container">
        <div className="adminLoginCard">
          <div className="adminLoginHeader">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <img
                src="/ypf-logo.png"
                alt="Youth Peace Foundation"
                style={{ width: '220px', height: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </div>
            <div className="lockIconCircle">
              <Lock size={28} />
            </div>
            <h2>Admin Portal Login</h2>
            <p>Enter the administrator password to access official receipts &amp; Excel registers.</p>
          </div>

          {loginError && (
            <div className="formErrorAlert">
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="adminLoginForm">
            <div className="field">
              <label htmlFor="adminPassword">Administrator Password</label>
              <div className="passwordInputGroup">
                <input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter administrator password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="showPassBtn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn submitBtn"
              style={{ marginTop: '16px' }}
            >
              {isLoggingIn ? 'Verifying...' : 'Unlock Admin Portal'}
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
            Live database of all donor receipts. Download full Excel spreadsheets of all records.
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
      <div className="statsGrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
      </div>

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
                  <th>District</th>
                  <th>Amount (₹)</th>
                  <th>Mode / UTR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
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
                          <div className="cellSub">-</div>
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
