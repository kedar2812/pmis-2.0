"""
RA Bill PDF Generator Service

Generates professional PDF bills using ReportLab with proper formatting
and saves them to project-specific folders.
"""
import os
from decimal import Decimal
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfgen import canvas
from io import BytesIO


class RABillPDFGenerator:
    """
    Service to generate professional RA Bill PDFs.
    """
    
    def __init__(self, bill):
        """
        Initialize with an RABill instance.
        
        Args:
            bill: RABill model instance
        """
        self.bill = bill
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()
        
        # Custom styles
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
        )
    
    def _format_currency(self, amount):
        """Format amount as Indian currency."""
        if amount is None:
            return "₹ 0.00"
        return f"₹ {amount:,.2f}"
    
    def _format_date(self, date):
        """Format date for display."""
        if date is None:
            return "N/A"
        return date.strftime("%d-%b-%Y")
    
    def generate(self):
        """
        Generate the PDF and return as bytes.
        
        Returns:
            bytes: PDF file content
        """
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        # Build PDF content
        story = []
        
        # Header
        story.append(Paragraph("RUNNING ACCOUNT BILL", self.title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Project and Bill Info
        story.extend(self._build_header_section())
        story.append(Spacer(1, 0.2*inch))
        
        # Financial Summary
        story.extend(self._build_financial_section())
        story.append(Spacer(1, 0.2*inch))
        
        # Deductions
        story.extend(self._build_deductions_section())
        story.append(Spacer(1, 0.2*inch))
        
        # Net Payable
        story.extend(self._build_net_payable_section())
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = self.buffer.getvalue()
        self.buffer.close()
        
        return pdf_bytes
    
    def _build_header_section(self):
        """Build header section with project and bill details."""
        elements = []
        
        data = [
            ['Project:', self.bill.project.name if self.bill.project else 'N/A'],
            ['Bill No:', self.bill.bill_no],
            ['Work Order No:', self.bill.work_order_no],
            ['Bill Date:', self._format_date(self.bill.bill_date)],
        ]
        
        if self.bill.contractor:
            contractor_name = f"{self.bill.contractor.first_name} {self.bill.contractor.last_name}".strip()
            data.append(['Contractor:', contractor_name or self.bill.contractor.username])
        
        if self.bill.period_from and self.bill.period_to:
            data.append(['Period:', f"{self._format_date(self.bill.period_from)} to {self._format_date(self.bill.period_to)}"])
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        return elements
    
    def _build_financial_section(self):
        """Build financial summary section."""
        elements = []
        
        elements.append(Paragraph("Financial Summary", self.heading_style))
        
        data = [
            ['Description', 'Amount'],
            ['Gross Amount', self._format_currency(self.bill.gross_amount)],
            ['GST ({:.2f}%)'.format(self.bill.gst_percentage), self._format_currency(self.bill.gst_amount)],
            ['Total Amount (Gross + GST)', self._format_currency(self.bill.total_amount)],
        ]
        
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        return elements
    
    def _build_deductions_section(self):
        """Build deductions section."""
        elements = []
        
        elements.append(Paragraph("Deductions & Recoveries", self.heading_style))
        
        data = [['Description', 'Amount']]
        
        # Add all deductions
        if self.bill.tds_amount > 0:
            data.append([
                f'TDS ({self.bill.get_tds_section_type_display()} - {self.bill.tds_percentage}%)',
                self._format_currency(self.bill.tds_amount)
            ])
        
        if self.bill.labour_cess_amount > 0:
            data.append([f'Labour Cess ({self.bill.labour_cess_percentage}%)', self._format_currency(self.bill.labour_cess_amount)])
        
        if self.bill.retention_amount > 0:
            data.append([f'Retention ({self.bill.retention_percentage}%)', self._format_currency(self.bill.retention_amount)])
        
        if self.bill.mobilization_advance_recovery > 0:
            data.append(['Mobilization Advance Recovery', self._format_currency(self.bill.mobilization_advance_recovery)])
        
        if self.bill.material_advance_recovery > 0:
            data.append(['Material Advance Recovery', self._format_currency(self.bill.material_advance_recovery)])
        
        if self.bill.plant_machinery_recovery > 0:
            data.append(['Plant & Machinery Recovery', self._format_currency(self.bill.plant_machinery_recovery)])
        
        if self.bill.penalty_amount > 0:
            data.append(['Penalty', self._format_currency(self.bill.penalty_amount)])
        
        if self.bill.other_deductions > 0:
            desc = f'Other Deductions ({self.bill.other_deduction_remarks})' if self.bill.other_deduction_remarks else 'Other Deductions'
            data.append([desc, self._format_currency(self.bill.other_deductions)])
        
        # Calculate total deductions
        total_deductions = (
            self.bill.tds_amount +
            self.bill.labour_cess_amount +
            self.bill.retention_amount +
            self.bill.mobilization_advance_recovery +
            self.bill.material_advance_recovery +
            self.bill.plant_machinery_recovery +
            self.bill.penalty_amount +
            self.bill.other_deductions
        )
        
        data.append(['Total Deductions', self._format_currency(total_deductions)])
        
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (0, -2), 'Helvetica'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fee2e2')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        return elements
    
    def _build_net_payable_section(self):
        """Build net payable section."""
        elements = []
        
        data = [[
            Paragraph('<b>NET PAYABLE</b>', self.title_style),
            Paragraph(f'<b>{self._format_currency(self.bill.net_payable)}</b>', self.title_style)
        ]]
        
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(table)
        return elements
    
    def save_to_file(self):
        """
        Generate PDF and save to file field.
        
        Returns:
            str: Path to saved file
        """
        # Generate PDF bytes
        pdf_bytes = self.generate()
        
        # Create filename with project ID and bill number
        project_id = str(self.bill.project.id) if self.bill.project else 'unassigned'
        filename = f"projects/{project_id}/ra_bills/bill_{self.bill.bill_no.replace('/', '_')}.pdf"
        
        # Save to FileField
        self.bill.bill_pdf_file.save(
            filename,
            ContentFile(pdf_bytes),
            save=True
        )
        
        return self.bill.bill_pdf_file.url


def generate_ra_bill_pdf(bill):
    """
    Helper function to generate and save RA Bill PDF.
    
    Args:
        bill: RABill instance
    
    Returns:
        str: URL of the generated PDF
    """
    generator = RABillPDFGenerator(bill)
    return generator.save_to_file()
