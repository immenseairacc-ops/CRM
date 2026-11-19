import { jsPDF } from 'jspdf';
import { LeadQuotation } from '@/types/crm';

/**
 * Capture exact rendered Live A4 DOM elements from QuotationModal using html2canvas
 * to produce 100% pixel-perfect matching PDF.
 */
export async function captureExactQuotationHtmlPdf(rootElement: HTMLElement): Promise<{ blob: Blob; base64: string }> {
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pages = Array.from(rootElement.querySelectorAll('.a4-page')) as HTMLElement[];
  const targetPages = pages.length > 0 ? pages : [rootElement];

  for (let i = 0; i < targetPages.length; i++) {
    const pageEl = targetPages[i];
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  const base64 = pdf.output('datauristring');
  const blob = pdf.output('blob');
  return { blob, base64 };
}

export function generateQuotationPdfBlob(quotation: LeadQuotation): { blob: Blob; base64: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const navy = [15, 42, 95];
  const orange = [242, 89, 31];

  // ==========================================
  // PAGE 1: OFFICIAL BRAND COVER PAGE (Matching 2nd Image Theme)
  // ==========================================
  
  // Decorative modern background wave curve in top right
  doc.setFillColor(navy[0], navy[1], navy[2]);
  // Top right block / wave simulation
  doc.triangle(90, 0, pageWidth, 0, pageWidth, 120, 'F');
  doc.rect(130, 0, pageWidth - 130, 120, 'F');

  // Orange swoosh line
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(2.5);
  doc.line(75, 0, pageWidth, 135);

  // Decorative dots pattern simulation
  doc.setFillColor(255, 255, 255);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      doc.circle(pageWidth - 32 + c * 4, 18 + r * 4, 0.7, 'F');
    }
  }

  // Immense Air Logo Symbol
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(18, 18, 14, 18, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 24, 2.5, 'F');
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.circle(25, 24, 1.4, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(23, 29, 4, 7, 'F');

  // Logo Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('IMMENSE AIR', 36, 26);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('PVT LTD', 36, 33);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Smart Communication. ', 18, 44);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('Stronger Results.', 56, 44);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(18, 47, 44, 47);

  // Hero Title: BUSINESS PROPOSAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(38);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('BUSINESS', 18, 68);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('PROPOSAL', 18, 81);

  // Modern accent color bars
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(18, 88, 22, 1.8, 'F');
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(43, 88, 16, 1.8, 'F');
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(62, 88, 18, 1.8, 'F');
  doc.circle(84, 89, 1.2, 'F');
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.circle(88, 89, 1.2, 'F');

  // Value Proposition Paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(80, 95, 115);
  doc.text(
    'We are pleased to present our Communication Solutions that empower your business to connect, engage, and grow faster with our reliable and innovative messaging services.',
    18,
    100,
    { maxWidth: 170, lineHeightFactor: 1.4 }
  );

  // Proposal Meta & Client Partnership Box
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(18, 122, pageWidth - 36, 48, 3, 3, 'F');
  doc.setDrawColor(220, 230, 245);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, 122, pageWidth - 36, 48, 3, 3, 'S');

  // Left: Client info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 170);
  doc.text('PREPARED FOR VALUED CLIENT', 26, 132);

  doc.setFontSize(15);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(quotation.companyName || 'Valued Business Client', 26, 142);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 85, 105);
  doc.text(`Contact Person: ${quotation.clientName || 'Partner'}`, 26, 150);
  doc.text(`Mobile: ${quotation.phone || '+91 918291060764'}`, 26, 156);
  doc.text(`Email: ${quotation.email || 'support@immensesmartsolutions.com'}`, 26, 162);

  // Right: Proposal Number & Date
  doc.line(pageWidth / 2 + 10, 128, pageWidth / 2 + 10, 164);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 170);
  doc.text('PROPOSAL IDENTIFIER', pageWidth / 2 + 18, 132);

  doc.setFontSize(13);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(quotation.quotationNumber, pageWidth / 2 + 18, 142);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 85, 105);
  doc.text(`Proposal Date: ${quotation.quotationDate}`, pageWidth / 2 + 18, 150);
  doc.text(`Validity: Valid until ${quotation.validUntil}`, pageWidth / 2 + 18, 156);
  doc.text(`Primary Channel: ${quotation.channel || 'Bulk SMS & Messaging'}`, pageWidth / 2 + 18, 162);

  // Why Immense Air Key Highlights (Cover badges)
  const badges = [
    { title: '99.9% Delivery', desc: 'Direct operator telecom scrub routes' },
    { title: 'Smart Analytics', desc: 'Real-time DLT & delivery logs' },
    { title: 'Instant Support', desc: 'Dedicated 24/7 account management' },
  ];

  badges.forEach((b, i) => {
    const bx = 18 + i * 59;
    doc.setFillColor(245, 248, 253);
    doc.roundedRect(bx, 180, 56, 32, 2, 2, 'F');
    doc.setDrawColor(225, 235, 248);
    doc.roundedRect(bx, 180, 56, 32, 2, 2, 'S');

    doc.setFillColor(orange[0], orange[1], orange[2]);
    doc.circle(bx + 8, 190, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(b.title, bx + 14, 191);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 105, 125);
    doc.text(b.desc, bx + 8, 199, { maxWidth: 44, lineHeightFactor: 1.3 });
  });

  // Cover Page Bottom Footer Wave
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, pageHeight - 24, pageWidth, 24, 'F');
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(0, pageHeight - 26, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('IMMENSE AIR PVT LTD  •  IMMENSE SMART SOLUTION', pageWidth / 2, pageHeight - 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 215, 240);
  doc.text('www.immenseair.in  |  info@immenseair.in  |  +91 2245 00 3131', pageWidth / 2, pageHeight - 8, { align: 'center' });


  // ==========================================
  // PAGE 2: COMMERCIAL QUOTATION & PRICING TABLE
  // ==========================================
  doc.addPage();

  // Top header banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('IMMENSE AIR PVT LTD', 18, 13);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('Commercial Proposal & Rate Quotation', 18, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Proposal: ${quotation.quotationNumber}`, pageWidth - 18, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 245);
  doc.text(`Date: ${quotation.quotationDate}  |  Valid: ${quotation.validUntil}`, pageWidth - 18, 19, { align: 'right' });

  // Section Heading
  let y = 38;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('COMMERCIAL PRICING & SERVICES BREAKDOWN', 18, y);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(0.8);
  doc.line(18, y + 2, 70, y + 2);

  y += 10;

  // Table Heading
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(18, y, pageWidth - 36, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SR', 22, y + 6);
  doc.text('SERVICE / PRODUCT DESCRIPTION', 34, y + 6);
  doc.text('UNIT RATE', 120, y + 6, { align: 'right' });
  doc.text('QUANTITY', 152, y + 6, { align: 'right' });
  doc.text('AMOUNT (INR)', pageWidth - 22, y + 6, { align: 'right' });

  y += 9;

  // Table Rows
  quotation.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 252, 255);
      doc.rect(18, y, pageWidth - 36, 11, 'F');
    }
    doc.setDrawColor(230, 238, 248);
    doc.line(18, y + 11, pageWidth - 18, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 55, 75);
    doc.text(String(index + 1), 22, y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.text(item.service, 34, y + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${item.rate.toFixed(3)}`, 120, y + 7.5, { align: 'right' });
    doc.text(item.count.toLocaleString('en-IN'), 152, y + 7.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 22, y + 7.5, { align: 'right' });

    y += 11;
  });

  // Totals Box
  y += 6;
  const totalsX = pageWidth - 94;
  doc.setFillColor(248, 250, 254);
  doc.roundedRect(totalsX, y, 76, 32, 2, 2, 'F');
  doc.setDrawColor(215, 225, 240);
  doc.roundedRect(totalsX, y, 76, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 85, 105);
  doc.text('Subtotal:', totalsX + 6, y + 8);
  doc.text(`Rs. ${quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 22, y + 8, { align: 'right' });

  doc.text(`GST (${quotation.gstPercent}%):`, totalsX + 6, y + 16);
  doc.text(`Rs. ${quotation.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 22, y + 16, { align: 'right' });

  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.line(totalsX + 6, y + 20, pageWidth - 22, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Grand Total:', totalsX + 6, y + 27);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(`Rs. ${quotation.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 22, y + 27, { align: 'right' });

  // Terms & Conditions
  const termsY = y + 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('TERMS & CONDITIONS:', 18, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 100);
  const terms = [
    '• Payment terms: Post-paid or as mutually agreed in formal service contract.',
    '• Validity: Proposal rates valid for 15 days from the date of issue.',
    '• Government statutory taxes (18% GST) applicable as per prevailing GST regulations.',
    '• DLT registration charges & operator telecom scrub charges as per TRAI mandates.',
    '• 24x7 NOC monitoring and priority escalation support included.',
  ];
  terms.forEach((t, i) => {
    doc.text(t, 18, termsY + 6 + i * 5);
  });

  // Account Manager Sign-off Card
  const mgrY = termsY + 38;
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(18, mgrY, pageWidth - 36, 26, 2, 2, 'F');
  doc.setDrawColor(220, 230, 245);
  doc.roundedRect(18, mgrY, pageWidth - 36, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`Commercial Authorized By: ${quotation.managerName || 'Account Manager'}`, 24, mgrY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 95, 115);
  doc.text(`${quotation.managerDesignation || 'Sales & Marketing Manager'}  •  Immense Air Pvt Ltd (Immense Smart Solutions)`, 24, mgrY + 15);
  doc.text(`Direct Mobile: ${quotation.managerPhone || '+91 9768566466'}  •  Email: ${quotation.managerEmail || 'parvej@immenseair.in'}  •  www.immenseair.in`, 24, mgrY + 21);

  // Footer bar on Page 2
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('Immense Air Pvt Ltd (Immense Smart Solutions) — Page 2 / Confidential Commercial Proposal', pageWidth / 2, pageHeight - 3, { align: 'center' });

  const base64 = doc.output('datauristring');
  const blob = doc.output('blob');

  return { blob, base64 };
}
