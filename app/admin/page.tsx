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
  Database,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { ReceiptData } from '@/components/DigitalReceipt';
import {
  getLocalReceipts,
  mergeReceipts,
  syncReceiptsWithServer,
  exportReceiptsToExcel,
  exportReceiptsToJson,
  saveReceiptLocally,
  recordContributionId
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

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const items: ReceiptData[] = Array.isArray(parsed) ? parsed : [parsed];
        if (items.length === 0) {
          alert('No valid receipt data found in JSON file.');
          return;
        }

        // Save each locally and record sequence ID
        for (const item of items) {
          if (item && item.receipt_no) {
            saveReceiptLocally(item);
            if (item.contribution_id) {
              recordContributionId(Number(item.contribution_id));
            }
          }
        }

        // Sync to server API
        await syncReceiptsWithServer();

        // Refresh admin table
        await fetchReceipts();
        setSyncStatus(`Successfully imported ${items.length} records!`);
        setTimeout(() => setSyncStatus(null), 5000);
      } catch (err: any) {
        alert('Failed to import JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: hasCloudDb ? '#ecfdf5' : '#fffbeb',
              color: hasCloudDb ? '#065f46' : '#b45309',
              border: hasCloudDb ? '1px solid #bbf7d0' : '1px solid #fde68a'
            }}>
              {hasCloudDb ? (
                <>
                  <CheckCircle2 size={14} color="#16a34a" />
                  Cloud Database Active (Multi-Device Sync Online)
                </>
              ) : (
                <>
                  <AlertTriangle size={14} color="#d97706" />
                  Local Device Mode Only (No Cloud DB Connected)
                </>
              )}
            </span>

            {!hasCloudDb && (
              <button
                onClick={() => setShowDbGuide(!showDbGuide)}
                style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {showDbGuide ? 'Hide Setup Guide' : '⚠️ Connect Free Cloud DB to See All Users’ Receipts'}
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
          <label
            className="btn secondary"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
            title="Import a JSON backup from another volunteer's device"
          >
            <Upload size={16} /> Import JSON
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJson}
            />
          </label>
          <button
            onClick={handleLogout}
            className="btn secondary logoutBtn"
            title="Log out of Admin Portal"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Cloud DB Alert & Guide */}
      {!hasCloudDb && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#78350f',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: '#92400e', marginBottom: '8px' }}>
            <AlertTriangle size={18} color="#d97706" />
            Why are receipts generated by other people not appearing here?
          </div>
          <p style={{ margin: '0 0 10px 0' }}>
            Your application is currently running in <strong>Local Device Mode</strong>. Because Vercel operates on isolated serverless containers, receipts created by volunteers on their own phones or computers are stored <strong>only on their devices</strong> and cannot automatically reach this Admin portal until a shared cloud database is connected.
          </p>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: '#92400e' }}>
            Permanent Solution: Connect Free Turso Cloud Database (3 Minutes, 100% Free Forever, No Credit Card):
          </div>
          <ol style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
            <li>Open <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}>turso.tech</a> and create a free account (Sign in with GitHub or email).</li>
            <li>Click <strong>Create database</strong> &rarr; name it <code>ypf-receipts</code>.</li>
            <li>From your database dashboard, copy the <strong>Database URL</strong> and generate an <strong>Auth Token</strong>.</li>
            <li>Go to your project on <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}>vercel.com</a> &rarr; <strong>Settings</strong> &rarr; <strong>Environment Variables</strong> and add:
              <ul style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                <li><code>TURSO_DATABASE_URL</code> = <code>libsql://ypf-receipts-your-org.turso.io</code></li>
                <li><code>TURSO_AUTH_TOKEN</code> = <code>eyJ...your_token</code></li>
              </ul>
            </li>
            <li>Click <strong>Redeploy</strong> in Vercel. Done! All receipts generated from any phone or computer anywhere will immediately sync and appear right here.</li>
          </ol>
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
            💡 <strong>Quick Fix for Already-Generated Receipts:</strong> Any volunteer who already created receipts on their phone can open <code>/admin</code> on that phone (password: <code>Premrawat_100</code>), click <strong>Backup JSON</strong>, and send you the file. You can then click the <strong>Import JSON</strong> button above to immediately import all their receipts into this dashboard!
          </div>
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
