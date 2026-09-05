'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, CheckCircle2, Clock, AlertTriangle, ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { encodeReceiptToken } from '@/lib/receipt-token';

export interface ReceiptData {
  id?: number;
  receipt_no: string;
  contribution_id: number;
  date: string;
  ac?: string | null;
  contributor_name: string;
  address?: string | null;
  district: string;
  pin_code: string;
  contact_no: string;
  pan_aadhaar?: string | null;
  receiver_name: string;
  amount: number;
  amount_words: string;
  payment_mode: string;
  transaction_id?: string | null;
  verification_status: 'VERIFIED' | 'PENDING' | 'FAILED' | string;
  bank_transaction_date?: string | null;
  verification_reference?: string | null;
}

interface Props {
  receipt: ReceiptData;
  onBack?: () => void;
  onRefresh?: (updatedReceipt: ReceiptData) => void;
}

export default function DigitalReceipt({ receipt, onBack, onRefresh }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [bankMsg, setBankMsg] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ypf.org.in';
    const token = encodeReceiptToken(receipt);
    const verifyUrl = `${origin}/verify/${encodeURIComponent(receipt.receipt_no)}?t=${token}`;

    QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#1e3d2f',
        light: '#ffffff'
      }
    }).then(url => setQrDataUrl(url)).catch(err => console.error(err));

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  }, [receipt]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('printable-receipt');
          if (el) {
            el.classList.add('pdfExportMode');
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      // 8mm safe margins on all sides
      const margin = 8;
      const printableWidth = pageWidth - 2 * margin; // 194 mm
      const printableHeight = pageHeight - 2 * margin; // 281 mm

      // Scale to fit printable width first
      let imgWidth = printableWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If the rendered receipt height exceeds printable height, scale down to fit on single page
      if (imgHeight > printableHeight) {
        imgHeight = printableHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Center the receipt perfectly on the single A4 page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`Receipt_${receipt.receipt_no}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. You can also click "Print Receipt" and choose Save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('printable-receipt');
          if (el) {
            el.classList.add('pdfExportMode');
          }
        }
      });
      const link = document.createElement('a');
      link.download = `Receipt_${receipt.receipt_no}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
    }
  };

  const handleVerifyBankNow = async () => {
    if (!receipt.transaction_id) {
      alert('No Transaction ID/UTR on this receipt.');
      return;
    }
    setIsVerifying(true);
    setBankMsg(null);
    try {
      const res = await fetch(`/api/receipts/${receipt.receipt_no}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_bank' })
      });
      const data = await res.json();
      if (data.success && data.receipt) {
        setBankMsg('Bank Verification Successful! Transaction Settled.');
        if (onRefresh) onRefresh(data.receipt);
      } else {
        setBankMsg(data.message || 'Verification could not be settled by bank.');
      }
    } catch (err: any) {
      setBankMsg('Verification error: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const isVerified = receipt.verification_status === 'VERIFIED';

  return (
    <div className="receiptWrapper">
      {/* Action Controls Bar */}
      <div className="receiptActionsBar no-print">
        {onBack && (
          <button onClick={onBack} className="btn secondary">
            <ArrowLeft size={16} /> Create Another
          </button>
        )}
        <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn pdfDownloadBtn">
          <FileText size={16} /> {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
        </button>
        <button onClick={handlePrint} className="btn">
          <Printer size={16} /> Print Receipt
        </button>
        <button onClick={handleDownloadImage} className="btn gold">
          <Download size={16} /> Download Image (PNG)
        </button>
        {!isVerified && receipt.transaction_id && (
          <button
            onClick={handleVerifyBankNow}
            disabled={isVerifying}
            className="btn verifyBankBtn"
          >
            <ShieldCheck size={16} /> {isVerifying ? 'Verifying with Bank...' : 'Verify Amount with Bank'}
          </button>
        )}
      </div>

      {bankMsg && (
        <div className={`bankAlertNotice no-print ${isVerified ? 'successNotice' : 'warnNotice'}`}>
          {bankMsg}
        </div>
      )}

      {/* The Printable / Downloadable Digital Receipt matching Image 1 */}
      <div className="digitalReceiptDoc" ref={receiptRef} id="printable-receipt">
        {/* Header: Logo and Title */}
        <div className="receiptHeader">
          {/* Official Logo */}
          <div className="officialLogoContainer">
            <img
              src="/ypf-logo.png"
              alt="Youth Peace Foundation"
              style={{ width: '260px', height: 'auto', margin: '0 auto 6px', display: 'block', objectFit: 'contain' }}
            />
          </div>

          {/* Organization Legal & Registration Details */}
          <div className="receiptOrgMetaBox">
            <div className="receiptOrgAddress">X-32, Basement, Okhla Industrial Area, Phase II, Delhi - 110020</div>
            <div className="receiptOrgReg">
              <span>Registration No. <strong>AAACY7098KE20198</strong></span> &nbsp;|&nbsp; 
              <span>PAN No. <strong>AAACY7098K</strong></span>
            </div>
            <div className="receiptOrgCin">CIN: <strong>U93000DL2014NPL271796</strong></div>
          </div>

          {/* Diamond Line Divider */}
          <div className="diamondDivider">
            <span className="line" />
            <span className="diamond">◆</span>
            <span className="line" />
          </div>

          <h2 className="receiptTitle">DIGITAL CONTRIBUTION RECEIPT</h2>
          <p className="missionTagline">
            Thank you for supporting our mission.<br />
            Together, we build a more peaceful and empowered society.
          </p>

          <div className="diamondDivider">
            <span className="line" />
            <span className="diamond">◆</span>
            <span className="line" />
          </div>
        </div>

        {/* Metadata Card: 2 Columns */}
        <div className="metadataCard">
          <div className="metaCol">
            <div className="metaRow">
              <span className="metaLabel">Receipt No.</span>
              <span className="metaSep">:</span>
              <strong className="metaValue metaReceiptNo">{receipt.receipt_no}</strong>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Date</span>
              <span className="metaSep">:</span>
              <span className="metaValue">{receipt.date}</span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Location</span>
              <span className="metaSep">:</span>
              <span className="metaValue">Youth Peace Foundation</span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Place of Issue</span>
              <span className="metaSep">:</span>
              <span className="metaValue">India</span>
            </div>
          </div>

          <div className="metaCol">
            <div className="metaRow">
              <span className="metaLabel">Contribution ID</span>
              <span className="metaSep">:</span>
              <strong className="metaValue metaContribId">{receipt.contribution_id}</strong>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Verification Status</span>
              <span className="metaSep">:</span>
              <span className={`metaValue statusBadge ${isVerified ? 'statusVerified' : 'statusPending'}`}>
                {receipt.verification_status}
              </span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Transaction ID / UTR</span>
              <span className="metaSep">:</span>
              <span className="metaValue metaMono">{receipt.transaction_id || '-'}</span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Transaction Date (Bank)</span>
              <span className="metaSep">:</span>
              <span className="metaValue">{receipt.bank_transaction_date || '-'}</span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Verification Reference</span>
              <span className="metaSep">:</span>
              <span className="metaValue">{receipt.verification_reference || '-'}</span>
            </div>
          </div>
        </div>

        {/* Section 1: CONTRIBUTOR DETAILS */}
        <div className="receiptSection">
          <div className="sectionHeaderBar">CONTRIBUTOR DETAILS</div>
          <div className="detailsTable">
            <div className="tableRow">
              <div className="tableCell cellLabel">Name</div>
              <div className="tableCell cellVal">{receipt.contributor_name}</div>
              <div className="tableCell cellLabel">Contact No.</div>
              <div className="tableCell cellVal">{receipt.contact_no}</div>
            </div>
            <div className="tableRow">
              <div className="tableCell cellLabel">Address</div>
              <div className="tableCell cellVal">{receipt.address || '-'}</div>
              <div className="tableCell cellLabel">District</div>
              <div className="tableCell cellVal">{receipt.district}</div>
            </div>
            <div className="tableRow">
              <div className="tableCell cellLabel">PIN Code</div>
              <div className="tableCell cellVal">{receipt.pin_code}</div>
              <div className="tableCell cellLabel">PAN / Aadhaar No.</div>
              <div className="tableCell cellVal">{receipt.pan_aadhaar || '-'}</div>
            </div>
            <div className="tableRow">
              <div className="tableCell cellLabel">Receiver Name</div>
              <div className="tableCell cellVal fullSpan">{receipt.receiver_name}</div>
            </div>
          </div>
        </div>

        {/* Section 2: CONTRIBUTION DETAILS */}
        <div className="receiptSection">
          <div className="sectionHeaderBar">CONTRIBUTION DETAILS</div>
          <div className="detailsTable">
            <div className="tableRow">
              <div className="tableCell cellLabel" style={{ width: '30%' }}>Contribution Amount (₹)</div>
              <div className="tableCell cellVal fullSpan" style={{ fontWeight: 'bold' }}>
                {receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="tableRow">
              <div className="tableCell cellLabel" style={{ width: '30%' }}>Amount in Words</div>
              <div className="tableCell cellVal fullSpan">{receipt.amount_words}</div>
            </div>
          </div>
        </div>

        {/* Thank You Note */}
        <div className="thankYouNote">
          <p className="ty1">Thank you for your valuable contribution.</p>
          <p className="ty2">Your support helps us create a better and more peaceful tomorrow.</p>
        </div>

        {/* QR Code and Signatory Row */}
        <div className="qrSignatureRow">
          <div className="qrBox">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Verify Receipt QR Code" className="qrCodeImg" />
            ) : (
              <div className="qrPlaceholder">QR Code</div>
            )}
          </div>

          <div className="signatureBox">
            <div className="signGraphic">
              <svg viewBox="0 0 160 55" width="130" height="45">
                <path
                  d="M10 38 Q 28 8, 48 32 T 75 14 Q 92 42, 115 18 T 145 28"
                  fill="none"
                  stroke="#1c3b28"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d="M40 38 C 60 48, 120 46, 150 42"
                  fill="none"
                  stroke="#1c3b28"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div className="signBorderLine" />
            <div className="signLabel">Authorized Signatory</div>
            <div className="signOrg">Youth Peace Foundation</div>
          </div>
        </div>

        {/* Footer Organization & Legal Information */}
        <div className="receiptFooter">
          <div className="footerDivider" />
          <div className="footerOrgName">YOUTH PEACE FOUNDATION</div>
          <div className="footerTagline">Working for Peace, Harmony &amp; Sustainable Development</div>
          <div className="footerContact">
            www.ypf.org.in &nbsp;|&nbsp; contact@ypf.org.in &nbsp;|&nbsp; +91 12345 67890
          </div>
          <div className="footerTaxExempt">
            <strong>YOUTH PEACE FOUNDATION</strong><br />
            X-32, Basement, Okhla Industrial Area, Phase II, Delhi - 110020<br />
            Registration No. <strong>AAACY7098KE20198</strong> &nbsp;|&nbsp; PAN No. <strong>AAACY7098K</strong> &nbsp;|&nbsp; CIN: <strong>U93000DL2014NPL271796</strong><br />
            Donations exempt from income tax 1961 u/s 11-Clause (i) of first proviso to sub-section (5) of section 80G vide Registration no. AAACY7098KF20212 dated 24 Feb, 2022.
          </div>
          <div className="footerDisclaimer">
            This is a system generated receipt and does not require any physical signature.<br />
            Please keep this receipt for your records.
          </div>
        </div>
      </div>
    </div>
  );
}
