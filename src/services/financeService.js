import api from '@/api/client';

const financeService = {
    // --- FUND MANAGEMENT ---
    getFunds: async () => {
        const response = await api.get('/finance/funds/');
        return response.data;
    },

    createFund: async (data) => {
        const response = await api.post('/finance/funds/', data);
        return response.data;
    },

    // --- BUDGETING ---
    getBudgets: async (projectId) => {
        const response = await api.get('/finance/budgets/', { params: { project: projectId } });
        // Map response to include fund details if needed, though backend serializer key is 'fund_head' (ID)
        // If we need the name, we might need a nested serializer or separate fetch.
        // For now, return as is.
        return response.data;
    },

    createBudget: async (data) => {
        // Data should include { project, milestone, fund_head, cost_category, amount }
        const response = await api.post('/finance/budgets/', data);
        return response.data;
    },

    // --- RA BILLING ---
    getBills: async (projectId, status) => {
        const params = {};
        if (projectId) params.project = projectId;
        if (status) params.status = status;

        const response = await api.get('/finance/bills/', { params });
        // Transform snake_case to camelCase for Frontend
        return response.data.map(transformBillToFrontend);
    },

    createBill: async (data) => {
        // Transform camelCase to snake_case for Backend
        const backendData = transformBillToBackend(data);
        const response = await api.post('/finance/bills/', backendData);
        return transformBillToFrontend(response.data);
    },

    verifyBill: async (billId) => {
        const response = await api.post(`/finance/bills/${billId}/verify/`);
        return response.data;
    },

    // --- SETTINGS ---
    getSettings: async (projectId) => {
        const response = await api.get('/finance/settings/by_project/', { params: { project: projectId } });
        return response.data;
    },

    // --- SCHEDULING ---
    getScheduleTasks: async (projectId) => {
        const response = await api.get('/scheduling/tasks/', { params: { project: projectId } });
        return response.data;
    },

    // --- BOQ ---
    getBOQItems: async (projectId) => {
        const response = await api.get('/finance/boq/', { params: { project: projectId } });
        return response.data;
    },

    analyzeBOQFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/finance/boq/analyze_file/', formData);
        return response.data;
    },

    importBOQFile: async (projectId, file, mapping) => {
        const formData = new FormData();
        formData.append('project_id', projectId);
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(mapping));

        const response = await api.post('/finance/boq/import_file/', formData);
        return response.data;
    }
};

// --- DATA TRANSFORMERS ---

const transformBillToBackend = (data) => {
    // Map TDS String to Enum
    const tdsMap = {
        '194C - Individual / HUF (1%)': '194C_IND',
        '194C - Others (2%)': '194C_OTH',
        '194J - Professional Fees (10%)': '194J'
    };

    return {
        project: data.projectId,
        contractor: data.contractorId,
        milestone: data.milestoneId || null, // Ensure this field is handled if added to UI

        bill_no: data.billNo,
        work_order_no: data.workOrderNo,
        bill_date: data.submissionDate,
        period_from: data.periodFrom || null,
        period_to: data.periodTo || null,

        gross_amount: data.grossAmount,
        gst_percentage: data.gstRate,
        // gst_amount is auto-calc by backend

        tds_section_type: tdsMap[data.tdsCategory] || 'NONE',
        tds_percentage: data.tdsRate,
        // tds_amount is auto-calc

        labour_cess_percentage: data.labourCessRate,

        retention_percentage: data.retentionRate,
        // retention_amount is auto-calc

        mobilization_advance_recovery: data.mobilizationRecovery || 0,
        material_advance_recovery: data.materialRecovery || 0,
        plant_machinery_recovery: 0, // Not in UI yet

        penalty_amount: data.penaltyAmount || 0,
        price_adjustment: data.priceAdjustment || 0,
        insurance_recovery: data.insuranceRecovery || 0,
        other_deductions: data.otherDeductions || 0,

        // net_payable is auto-calc
        status: 'SUBMITTED'
    };
};

const transformBillToFrontend = (data) => {
    // Map Enum to TDS String (Reverse)
    const tdsMapReverse = {
        '194C_IND': '194C - Individual / HUF (1%)',
        '194C_OTH': '194C - Others (2%)',
        '194J': '194J - Professional Fees (10%)',
        'NONE': 'None'
    };

    return {
        id: data.id,
        projectId: data.project,
        projectName: data.project_name,
        contractorId: data.contractor,
        contractorName: data.contractor_name, // Serializer provides this

        billNo: data.bill_no,
        workOrderNo: data.work_order_no,
        submissionDate: data.bill_date,
        periodFrom: data.period_from,
        periodTo: data.period_to,

        grossAmount: parseFloat(data.gross_amount),
        gstRate: parseFloat(data.gst_percentage),
        gstAmount: parseFloat(data.gst_amount),
        totalAmount: parseFloat(data.total_amount),

        tdsCategory: tdsMapReverse[data.tds_section_type] || 'None',
        tdsRate: parseFloat(data.tds_percentage),
        tdsAmount: parseFloat(data.tds_amount),

        labourCessRate: parseFloat(data.labour_cess_percentage),
        labourCessAmount: parseFloat(data.labour_cess_amount),

        retentionRate: parseFloat(data.retention_percentage),
        retentionAmount: parseFloat(data.retention_amount),

        mobilizationRecovery: parseFloat(data.mobilization_advance_recovery),
        materialRecovery: parseFloat(data.material_advance_recovery),

        penaltyAmount: parseFloat(data.penalty_amount),
        insuranceRecovery: parseFloat(data.insurance_recovery || 0), // Schema check needed
        otherDeductions: parseFloat(data.other_deductions),

        netPayable: parseFloat(data.net_payable),
        status: data.status
    };
};

export default financeService;
