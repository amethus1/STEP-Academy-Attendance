import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toISODateString } from './dateUtils';

interface ReportData {
    title: string;
    subtitle?: string;
    columns: { header: string; dataKey: string }[];
    data: any[];
    summary?: { label: string; value: string | number }[];
}

export const generatePDF = (report: ReportData, filename: string = 'report') => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(report.title, 14, 20);

    if (report.subtitle) {
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(report.subtitle, 14, 28);
    }

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated: ${toISODateString(new Date())}`, 14, 35);

    // Summary Section (if any)
    let startY = 45;
    if (report.summary && report.summary.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Summary", 14, startY);
        startY += 8;

        doc.setFontSize(10);
        report.summary.forEach(item => {
            doc.text(`${item.label}: ${item.value}`, 14, startY);
            startY += 6;
        });
        startY += 10;
    }

    // Table
    autoTable(doc, {
        startY: startY,
        head: [report.columns.map(c => c.header)],
        body: report.data.map(row => report.columns.map(c => row[c.dataKey])),
        theme: 'grid',
        headStyles: { fillColor: [66, 133, 244] }, // Brand color approximation
        styles: { fontSize: 10 },
    });

    doc.save(`${filename}.pdf`);
};
