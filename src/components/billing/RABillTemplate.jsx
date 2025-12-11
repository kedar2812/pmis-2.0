import React from 'react';

// This component is designed to be printed using window.print()
// It mimics the exact layout of the Excel sheet provided
export const RABillTemplate = React.forwardRef(({ bill, project, contractor }, ref) => {
    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div ref={ref} className="print-container bg-white p-8 text-xs font-sans text-black print:block print:w-full">
            <style type="text/css" media="print">
                {`
                    @page { size: A4 portrait; margin: 1cm; }
                    .print-container { display: block !important; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
                    .header-cell { background-color: #f0f0f0; font-weight: bold; }
                    .section-header { background-color: #e0e0e0; font-weight: bold; text-align: left; }
                    .input-cell { text-align: right; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    .no-border-left { border-left: none; }
                    .no-border-right { border-right: none; }
                `}
            </style>

            <h1 className="text-center text-lg font-bold mb-6 uppercase border-b-2 border-black pb-2">
                RA Bill – TDS & Tax Deduction Calculation Sheet
            </h1>

            {/* 1. PROJECT & VENDOR DETAILS */}
            <table>
                <tbody>
                    <tr>
                        <td colSpan="2" className="section-header">1. PROJECT & VENDOR DETAILS</td>
                        <td colSpan="2"></td>
                    </tr>
                    <tr>
                        <td className="w-1/4 bold">Project Name</td>
                        <td className="w-1/4">{project?.name || '-'}</td>
                        <td className="w-1/4 bold">TDS CATEGORY MASTER</td>
                        <td className="w-1/4 text-center bold">Rate</td>
                    </tr>
                    <tr>
                        <td className="bold">Project Code / Cost Centre</td>
                        <td>{project?.code || '-'}</td>
                        <td>194C - Individual / HUF (1%)</td>
                        <td className="text-right">1.00%</td>
                    </tr>
                    <tr>
                        <td className="bold">Package Code / Cost Centre</td>
                        <td>{bill?.packageCode || '-'}</td>
                        <td>194C - Others (2%)</td>
                        <td className="text-right">2.00%</td>
                    </tr>
                    <tr>
                        <td className="bold">Contractor / Vendor Name</td>
                        <td>{contractor?.contractorName || '-'}</td>
                        <td>194J - Professional Fees (10%)</td>
                        <td className="text-right">10.00%</td>
                    </tr>
                    <tr>
                        <td className="bold">Vendor GSTIN</td>
                        <td>{contractor?.gstinNo || '-'}</td>
                        <td colSpan="2"></td>
                    </tr>
                    <tr>
                        <td className="bold">Work Order / Contract No.</td>
                        <td>{bill?.workOrderNo || '-'}</td>
                        <td colSpan="2"></td>
                    </tr>
                    <tr>
                        <td className="bold">RA Bill No.</td>
                        <td>{bill?.billNo || '-'}</td>
                        <td colSpan="2"></td>
                    </tr>
                    <tr>
                        <td className="bold">RA Bill Period (From – To)</td>
                        <td>{formatDate(bill?.periodFrom)} to {formatDate(bill?.periodTo)}</td>
                        <td colSpan="2"></td>
                    </tr>
                    <tr>
                        <td className="bold">Bill Submission Date</td>
                        <td>{formatDate(bill?.submissionDate)}</td>
                        <td colSpan="2"></td>
                    </tr>
                </tbody>
            </table>

            {/* 2. BILL AMOUNT DETAILS */}
            <table>
                <tbody>
                    <tr>
                        <td colSpan="4" className="section-header">2. BILL AMOUNT DETAILS</td>
                    </tr>
                    <tr>
                        <td className="w-1/2">Gross Bill Amount (Before GST)</td>
                        <td className="w-1/4"></td>
                        <td className="w-1/4 text-right">{formatCurrency(bill?.grossAmount)}</td>
                        <td className="w-0 border-0"></td>
                    </tr>
                    <tr>
                        <td>GST Rate (%)</td>
                        <td></td>
                        <td className="text-right">{bill?.gstRate}%</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>GST Amount</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.gstAmount)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td className="bold">Bill Amount Including GST</td>
                        <td></td>
                        <td className="text-right bold">{formatCurrency(bill?.totalAmount)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            {/* 3. STATUTORY DEDUCTIONS */}
            <table>
                <tbody>
                    <tr>
                        <td colSpan="4" className="section-header">3. STATUTORY DEDUCTIONS</td>
                    </tr>
                    <tr>
                        <td colSpan="4" className="bold bg-slate-50">3A. TDS (Income Tax)</td>
                    </tr>
                    <tr>
                        <td className="w-1/2">TDS Category</td>
                        <td className="w-1/4"></td>
                        <td className="w-1/4">{bill?.tdsCategory || '-'}</td>
                        <td className="w-0 border-0"></td>
                    </tr>
                    <tr>
                        <td>TDS Rate (%)</td>
                        <td></td>
                        <td className="text-right">{bill?.tdsRate}%</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>TDS Amount</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.tdsAmount)}</td>
                        <td></td>
                    </tr>

                    <tr>
                        <td colSpan="4" className="bold bg-slate-50">3B. LABOUR CESS</td>
                    </tr>
                    <tr>
                        <td>Labour Welfare Cess Rate (%)</td>
                        <td></td>
                        <td className="text-right">{bill?.labourCessRate}%</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Labour Welfare Cess Amount</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.labourCessAmount)}</td>
                        <td></td>
                    </tr>

                    <tr>
                        <td colSpan="4" className="bold bg-slate-50">3C. RETENTION / SECURITY DEPOSIT</td>
                    </tr>
                    <tr>
                        <td>Retention Percentage (%)</td>
                        <td></td>
                        <td className="text-right">{bill?.retentionRate}%</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Retention Amount</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.retentionAmount)}</td>
                        <td></td>
                    </tr>

                    <tr>
                        <td colSpan="4" className="bold bg-slate-50">3D. ADVANCE RECOVERIES</td>
                    </tr>
                    <tr>
                        <td>Mobilization Advance Recovery</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.mobilizationRecovery)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Material Advance Recovery</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.materialRecovery)}</td>
                        <td></td>
                    </tr>

                    <tr>
                        <td colSpan="4" className="bold bg-slate-50">3E. OTHER DEDUCTIONS</td>
                    </tr>
                    <tr>
                        <td>Penalty / Liquidated Damages</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.penaltyAmount)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Price Adjustment</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.priceAdjustment)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Insurance Recovery</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.insuranceRecovery)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Any Other Deductions</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(bill?.otherDeductions)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            {/* 4. NET PAYABLE CALCULATION */}
            <table>
                <tbody>
                    <tr>
                        <td colSpan="4" className="section-header">4. NET PAYABLE CALCULATION</td>
                    </tr>
                    <tr>
                        <td className="w-1/2">Bill Amount Including GST</td>
                        <td className="w-1/4"></td>
                        <td className="w-1/4 text-right bold">{formatCurrency(bill?.totalAmount)}</td>
                        <td className="w-0 border-0"></td>
                    </tr>
                    <tr>
                        <td>Less: Total TDS</td>
                        <td></td>
                        <td className="text-right">({formatCurrency(bill?.tdsAmount)})</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Less: Labour Cess</td>
                        <td></td>
                        <td className="text-right">({formatCurrency(bill?.labourCessAmount)})</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Less: Retention</td>
                        <td></td>
                        <td className="text-right">({formatCurrency(bill?.retentionAmount)})</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Less: Advance Recoveries</td>
                        <td></td>
                        <td className="text-right">({formatCurrency((bill?.mobilizationRecovery || 0) + (bill?.materialRecovery || 0))})</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Less: Other Deductions</td>
                        <td></td>
                        <td className="text-right">({formatCurrency((bill?.penaltyAmount || 0) + (bill?.priceAdjustment || 0) + (bill?.insuranceRecovery || 0) + (bill?.otherDeductions || 0))})</td>
                        <td></td>
                    </tr>
                    <tr className="bg-slate-100">
                        <td className="bold">NET AMOUNT PAYABLE TO CONTRACTOR</td>
                        <td></td>
                        <td className="text-right bold border-double border-4">{formatCurrency(bill?.netPayable)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            {/* 5. EMD */}
            <table>
                <tbody>
                    <tr>
                        <td colSpan="4" className="section-header">5. EMD (Earnest Money Deposit)</td>
                    </tr>
                    <tr>
                        <td className="w-1/2">Bid Security Amount</td>
                        <td className="w-1/4"></td>
                        <td className="w-1/4 text-right">{formatCurrency(bill?.emdAmount)}</td>
                        <td className="w-0 border-0"></td>
                    </tr>
                </tbody>
            </table>

            {/* 6. CERTIFICATION */}
            <div className="mt-8 break-inside-avoid">
                <table className="mt-4">
                    <thead>
                        <tr>
                            <td colSpan="2" className="section-header">6. CERTIFICATION</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="h-24">
                            <td className="w-1/3 align-bottom">
                                <div className="font-bold">Prepared By</div>
                                <div className="mt-8 pt-2 border-t border-black w-2/3">Signature & Date</div>
                            </td>
                            <td className="w-1/3 align-bottom">
                                <div className="font-bold">Verified By (Cost Manager)</div>
                                <div className="mt-8 pt-2 border-t border-black w-2/3">Signature & Date</div>
                            </td>
                        </tr>
                        <tr className="h-24">
                            <td className="w-1/3 align-bottom">
                                <div className="font-bold">Approved By (Project Manager / Finance)</div>
                                <div className="mt-8 pt-2 border-t border-black w-2/3">Signature & Date</div>
                            </td>
                            <td className="w-1/3 align-bottom">
                                <div className="font-bold">Approval Date: _________________</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-8 text-center text-gray-500 font-mono text-[10px]">
                Generated via PMIS Zia on {new Date().toLocaleString('en-IN')}
            </div>
        </div>
    );
});
