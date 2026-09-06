'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Search,
  RefreshCw,
  PlusCircle,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  Database
} from 'lucide-react';
import { ReceiptData } from '@/components/DigitalReceipt';
import {
  getLocalReceipts,
  mergeReceipts,
  syncReceiptsWithServer,
  exportReceiptsToExcel,
  exportReceiptsToJson
} from '@/lib/local-receipts';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasCloudDb, setHasCloudDb] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showDbGuide, setShowDbGuide] = useState(false);

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

      const localList = getLocalReceipts();
      const filteredLocals = search
        ? localList.filter(
            r =>
              (r.receipt_no && r.receipt_no.toLowerCase().includes(search.toLowerCase())) ||
              (r.contributor_name && r.contributor_name.toLowerCase().includes(search.toLowerCase())) ||
              (r.contact_no && r.contact_no.includes(search)) ||
              (r.district && r.district.toLowerCase().includes(search.toLowerCase())) ||
              (r.transaction_id && r.transaction_id.toLowerCase().includes(search.toLowerCase()))
          )
        : localList;

      let serverList: ReceiptData[] = [];
      try {
        const res = await fetch(`/api/receipts?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts)) {
          serverList = data.receipts;
          if (typeof data.hasCloudDb === 'boolean') {
            setHasCloudDb(data.hasCloudDb);
          }
        }
      } catch (err) {
        console.warn('Could not fetch receipts from server, using local records:', err);
      }

      const merged = mergeReceipts(serverList, filteredLocals);
      setReceipts(merged);

      // Background sync
      syncReceiptsWithServer().then(({ synced }) => {
        if (synced > 0) {
          setSyncStatus(`${synced} local record(s) synced to database`);
          setTimeout(() => setSyncStatus(null), 4000);
        }
      });
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
  const totalCollected = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

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
            Live permanent register of all donor receipts. Download full Excel spreadsheets (.xlsx) or JSON backups anytime.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              background: hasCloudDb ? '#ecfdf5' : '#f0fdf4',
              color: hasCloudDb ? '#065f46' : '#166534',
              border: '1px solid #bbf7d0'
            }}>
              <CheckCircle2 size={14} color="#16a34a" />
              {hasCloudDb ? 'Cloud Database Active (Turso LibSQL)' : 'Permanent Storage Active (Device + Server)'}
            </span>

            {!hasCloudDb && (
              <button
                onClick={() => setShowDbGuide(!showDbGuide)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {showDbGuide ? 'Hide Cloud DB Guide' : 'Connect Turso Cloud DB (Free)'}
              </button>
            )}

            {syncStatus && (
              <span style={{ fontSize: '12px', color: '#059669', fontStyle: 'italic' }}>
                ✓ {syncStatus}
              </span>
            )}
          </div>
        </div>

        <div className="adminActionButtons">
          <Link href="/" className="btn secondary">
            <PlusCircle size={16} /> New Receipt
          </Link>
          <button
            onClick={() => exportReceiptsToExcel(receipts)}
            className="btn excelDownloadBtn"
            title="Download Excel (.xlsx) file containing all records"
          >
            <Download size={16} /> Download Excel (.xlsx)
          </button>
          <button
            onClick={() => exportReceiptsToJson(receipts)}
            className="btn secondary"
            title="Download JSON backup file of all records"
          >
            <FileJson size={16} /> Backup JSON
          </button>
          <button
            onClick={handleLogout}
            className="btn secondary logoutBtn"
            title="Log out of Admin Portal"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Optional Turso Guide Card */}
      {showDbGuide && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#1e3a8a',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
            <Database size={16} color="#2563eb" />
            Connect Free Turso Cloud Database (For multi-device sync across all volunteers)
          </div>
          <ol style={{ paddingLeft: '20px', margin: '0 0 10px 0' }}>
            <li>Go to <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>turso.tech</a> and create a free account (100% free, 9GB storage).</li>
            <li>Create a new database named <strong>ypf-receipts</strong>.</li>
            <li>In Vercel &rarr; Project Settings &rarr; Environment Variables, add:
              <ul style={{ marginTop: '4px' }}>
                <li><code>TURSO_DATABASE_URL</code> = <code>libsql://ypf-receipts-[org].turso.io</code></li>
                <li><code>TURSO_AUTH_TOKEN</code> = <code>[your_auth_token]</code></li>
              </ul>
            </li>
            <li>Click Redeploy in Vercel. All records from all devices and volunteers will instantly save to one central permanent cloud database!</li>
          </ol>
          <p style={{ margin: 0, color: '#3b82f6', fontSize: '12px' }}>
            <em>Note: Records created in your current browser are already permanently preserved in local device storage and included in all Excel downloads.</em>
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="statsGrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="statCard">
          <span className="statLabel">Total Donations (₹)</span>
          <strong className="statValue">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
          <span className="statSub">Across all saved records</span>
        </div>

        <div className="statCard">
          <span className="statLabel">Total Receipts</span>
          <strong className="statValue">{receipts.length}</strong>
          <span className="statSub">Saved in Register</span>
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
                          ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
