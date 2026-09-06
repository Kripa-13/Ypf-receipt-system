'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Download, Printer, ArrowLeft, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  verification_status?: string;
  bank_transaction_date?: string | null;
  verification_reference?: string | null;
}

interface Props {
  receipt: ReceiptData;
  onBack?: () => void;
  onRefresh?: (updatedReceipt: ReceiptData) => void;
}

export default function DigitalReceipt({ receipt, onBack }: Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      </div>

      {/* The Printable / Downloadable Digital Receipt */}
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

          {/* Organization Legal Details (Registration number removed per request) */}
          <div className="receiptOrgMetaBox">
            <div className="receiptOrgAddress">X-32, Basement, Okhla Industrial Area, Phase II, Delhi - 110020</div>
            <div className="receiptOrgReg">
              <span>PAN No. <strong>AAACY7098K</strong></span> &nbsp;|&nbsp; 
              <span>CIN: <strong>U93000DL2014NPL271796</strong></span>
            </div>
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

        {/* Metadata Card: 2 Clean Balanced Columns */}
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
          </div>

          <div className="metaCol">
            <div className="metaRow">
              <span className="metaLabel">Contribution ID</span>
              <span className="metaSep">:</span>
              <strong className="metaValue metaContribId">{receipt.contribution_id}</strong>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Payment Mode</span>
              <span className="metaSep">:</span>
              <span className="metaValue">{receipt.payment_mode}</span>
            </div>
            <div className="metaRow">
              <span className="metaLabel">Transaction ID / UTR</span>
              <span className="metaSep">:</span>
              <span className="metaValue metaMono">{receipt.transaction_id || '-'}</span>
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

        {/* Footer Organization & Legal Information (Registration numbers removed per request) */}
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
            PAN No. <strong>AAACY7098K</strong> &nbsp;|&nbsp; CIN: <strong>U93000DL2014NPL271796</strong>
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
