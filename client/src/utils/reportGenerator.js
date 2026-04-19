import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a branded PDF report with a table.
 * 
 * @param {Object} options - Configuration for the report.
 * @param {string} options.title - The title of the report.
 * @param {string} options.filename - The name of the downloaded file.
 * @param {Array} options.columns - Table columns [ { header: 'Name', dataKey: 'name' } ]
 * @param {Array} options.data - The data rows.
 * @param {Object} [options.studentInfo] - Optional student details (name, grade, etc.)
 * @param {string} [options.subtitle] - Optional subtitle (e.g., Exam Name or Date Range)
 */
export const generateReport = ({ title, filename, columns, data, studentInfo = null, subtitle = null }) => {
    const doc = jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header Branding
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDY BUDDY TMS', margin, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Advanced Education Management System', margin, 22);

    // Current Date
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    doc.text(`Generated: ${today}`, pageWidth - margin, 15, { align: 'right' });

    // Report Title
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin, 55);

    let currentY = 62;

    // Subtitle if any
    if (subtitle) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(subtitle, margin, currentY);
        currentY += 8;
    }

    // Student Info Section (if applicable)
    if (studentInfo) {
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 2, 2, 'FD');
        
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT DETAILS', margin + 5, currentY + 7);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${studentInfo.StudentName || 'N/A'}`, margin + 5, currentY + 14);
        doc.text(`Grade: ${studentInfo.Grade || 'N/A'}`, margin + 60, currentY + 14);
        doc.text(`ID: ${studentInfo.StudentID || 'N/A'}`, margin + 110, currentY + 14);
        
        currentY += 30;
    } else {
        currentY += 5;
    }

    // Build Table
    doc.autoTable({
        startY: currentY,
        columns: columns,
        body: data,
        theme: 'striped',
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left'
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [51, 65, 85]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
            // Footer
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
    });

    // Save PDF
    doc.save(`${filename || 'report'}.pdf`);
};
