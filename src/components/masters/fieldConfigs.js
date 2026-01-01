/**
 * Field configurations for each master data type
 * Used by MasterFormModal to dynamically render forms
 */

// Hierarchy Masters
export const zoneFields = [
    { name: 'code', label: 'Zone Code', required: true, placeholder: 'e.g., ZN-SOUTH', helpText: 'Unique identifier for this zone' },
    { name: 'name', label: 'Zone Name', required: true, placeholder: 'e.g., South Operations Zone' },
    { name: 'state_covered', label: 'State/Region', placeholder: 'e.g., Telangana' },
    { name: 'head', label: 'Zone Head', placeholder: 'Name and designation' },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'Active',
        options: [
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
        ]
    },
];

export const circleFields = (zones = []) => [
    { name: 'code', label: 'Circle Code', required: true, placeholder: 'e.g., C-CIVIL' },
    { name: 'name', label: 'Circle Name', required: true, placeholder: 'e.g., Civil Engineering Circle' },
    {
        name: 'zone',
        label: 'Parent Zone',
        type: 'select',
        required: true,
        options: zones.map(z => ({ value: z.id, label: `${z.code} - ${z.name}` }))
    },
    {
        name: 'authority_level',
        label: 'Authority Level',
        type: 'select',
        defaultValue: 'SE',
        options: [
            { value: 'CE', label: 'Chief Engineer' },
            { value: 'SE', label: 'Superintending Engineer' },
        ]
    },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'Active',
        options: [
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
        ]
    },
];

export const divisionFields = (circles = []) => [
    { name: 'code', label: 'Division Code', required: true, placeholder: 'e.g., DIV-NGR' },
    { name: 'name', label: 'Division Name', required: true, placeholder: 'e.g., North Gandhinagar Division' },
    {
        name: 'circle',
        label: 'Parent Circle',
        type: 'select',
        required: true,
        options: circles.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))
    },
    { name: 'hod', label: 'Head of Division', placeholder: 'HOD name' },
    { name: 'contact_email', label: 'Contact Email', type: 'email', placeholder: 'division@gov.in' },
    { name: 'contact_phone', label: 'Contact Phone', placeholder: '+91...' },
    { name: 'effective_date', label: 'Effective Date', type: 'date' },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'Active',
        options: [
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
        ]
    },
];

export const subDivisionFields = (divisions = []) => [
    { name: 'code', label: 'Sub-Division Code', required: true, placeholder: 'e.g., SD-01-W' },
    { name: 'name', label: 'Sub-Division Name', required: true, placeholder: 'e.g., West Sub-Division' },
    {
        name: 'division',
        label: 'Parent Division',
        type: 'select',
        required: true,
        options: divisions.map(d => ({ value: d.id, label: `${d.code} - ${d.name}` }))
    },
    { name: 'jurisdiction_area', label: 'Jurisdiction Area', placeholder: 'Geographic area covered' },
    { name: 'reporting_officer', label: 'Reporting Officer', placeholder: 'SDE name' },
];

// Geography Masters
export const districtFields = [
    { name: 'code', label: 'District Code', required: true, placeholder: 'e.g., D-410' },
    { name: 'name', label: 'District Name', required: true, placeholder: 'e.g., Medak' },
    { name: 'state_name', label: 'State', required: true, placeholder: 'e.g., Telangana' },
    { name: 'pincode_range', label: 'Pincode Range', placeholder: 'e.g., 502001 to 502999' },
];

export const townFields = (districts = []) => [
    { name: 'code', label: 'Town Code', required: true, placeholder: 'e.g., T-0010' },
    { name: 'name', label: 'Town/City Name', required: true, placeholder: 'e.g., Zaheerabad' },
    {
        name: 'district',
        label: 'District',
        type: 'select',
        required: true,
        options: districts.map(d => ({ value: d.id, label: `${d.code} - ${d.name}` }))
    },
    {
        name: 'classification',
        label: 'Classification',
        type: 'select',
        defaultValue: 'Town',
        options: [
            { value: 'Metropolitan', label: 'Metropolitan' },
            { value: 'Municipality', label: 'Municipality' },
            { value: 'Town', label: 'Town' },
            { value: 'Village', label: 'Village' },
        ]
    },
    { name: 'population', label: 'Population', type: 'number', placeholder: 'Estimated population' },
];

// Classification Masters
export const schemeTypeFields = [
    { name: 'code', label: 'Scheme Type Code', required: true, placeholder: 'e.g., ST-CS' },
    { name: 'name', label: 'Scheme Type Name', required: true, placeholder: 'e.g., Centrally Sponsored' },
    {
        name: 'category',
        label: 'Category',
        type: 'select',
        defaultValue: 'Infrastructure',
        options: [
            { value: 'Infrastructure', label: 'Infrastructure' },
            { value: 'Social Sector', label: 'Social Sector' },
            { value: 'Education', label: 'Education' },
            { value: 'Health', label: 'Health' },
            { value: 'Agriculture', label: 'Agriculture' },
            { value: 'Other', label: 'Other' },
        ]
    },
];

export const schemeFields = (schemeTypes = []) => [
    { name: 'code', label: 'Scheme Code', required: true, placeholder: 'e.g., PMSGY' },
    { name: 'name', label: 'Scheme Name', required: true, placeholder: 'e.g., Pradhan Mantri Gram Sadak Yojana' },
    {
        name: 'scheme_type',
        label: 'Scheme Type',
        type: 'select',
        required: true,
        options: schemeTypes.map(st => ({ value: st.id, label: `${st.code} - ${st.name}` }))
    },
    { name: 'funding_agency', label: 'Funding Agency', placeholder: 'e.g., Central Govt' },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'budget_head_code', label: 'Budget Head Code', placeholder: 'Accounting code' },
    { name: 'objective', label: 'Objective', type: 'textarea', placeholder: 'Brief description of scheme goals' },
];

export const workTypeFields = [
    { name: 'code', label: 'Work Type Code', required: true, placeholder: 'e.g., WT-ROAD' },
    { name: 'name', label: 'Work Type Name', required: true, placeholder: 'e.g., Road Construction' },
    {
        name: 'sector',
        label: 'Sector',
        type: 'select',
        defaultValue: 'PWD',
        options: [
            { value: 'PWD', label: 'Public Works Department' },
            { value: 'Irrigation', label: 'Irrigation' },
            { value: 'Health', label: 'Health' },
            { value: 'Education', label: 'Education' },
            { value: 'Roads', label: 'Roads & Highways' },
            { value: 'Water Supply', label: 'Water Supply' },
            { value: 'Other', label: 'Other' },
        ]
    },
    { name: 'unit_of_measurement', label: 'Unit of Measurement', placeholder: 'e.g., Km, Sq.m' },
];

export const projectCategoryFields = [
    { name: 'code', label: 'Category Code', required: true, placeholder: 'e.g., PC-MAJ' },
    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g., Major Project' },
    { name: 'threshold_value', label: 'Threshold Value (₹)', type: 'number', step: '0.01', placeholder: 'Minimum value in INR' },
    { name: 'approval_authority', label: 'Approval Authority', placeholder: 'e.g., Chief Engineer' },
];

// Entity Masters
export const contractorFields = [
    { name: 'code', label: 'Contractor Code', required: true, placeholder: 'e.g., C-10025' },
    { name: 'name', label: 'Contractor/Firm Name', required: true, placeholder: 'Full legal name' },
    {
        name: 'contractor_type',
        label: 'Contractor Type',
        type: 'select',
        defaultValue: 'Proprietorship',
        options: [
            { value: 'Proprietorship', label: 'Proprietorship' },
            { value: 'Partnership', label: 'Partnership' },
            { value: 'Private Limited', label: 'Private Limited' },
            { value: 'Public Limited', label: 'Public Limited' },
            { value: 'LLP', label: 'LLP' },
            { value: 'Government', label: 'Government Entity' },
            { value: 'Other', label: 'Other' },
        ]
    },
    {
        name: 'registration_class',
        label: 'Registration Class',
        type: 'select',
        options: [
            { value: 'Class A', label: 'Class A (Unlimited)' },
            { value: 'Class B', label: 'Class B (Up to ₹50 Cr)' },
            { value: 'Class C', label: 'Class C (Up to ₹10 Cr)' },
            { value: 'Class D', label: 'Class D (Up to ₹2 Cr)' },
            { value: 'Class E', label: 'Class E (Up to ₹50 Lakh)' },
        ]
    },
    { name: 'registration_number', label: 'Registration Number', placeholder: 'License/Reg number' },
    { name: 'pan', label: 'PAN', placeholder: '10-digit PAN', pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, patternMessage: 'Invalid PAN format' },
    { name: 'gstin', label: 'GSTIN', placeholder: '15-digit GSTIN' },
    { name: 'tds_rate', label: 'TDS Rate (%)', type: 'number', step: '0.01', defaultValue: '2.00' },
    { name: 'contact_person', label: 'Contact Person', placeholder: 'Key representative name' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'official@company.com' },
    { name: 'phone', label: 'Phone', placeholder: '+91...' },
    { name: 'address', label: 'Registered Address', type: 'textarea', placeholder: 'Full address' },
    { name: 'validity_date', label: 'Validity Date', type: 'date', helpText: 'Registration expiry date' },
    { name: 'blacklisted', label: 'Blacklisted', type: 'checkbox', checkboxLabel: 'Contractor is blacklisted' },
];

// Finance Config
export const etpFields = [
    { name: 'code', label: 'ETP Code', required: true, placeholder: 'e.g., LABOUR-CESS' },
    { name: 'name', label: 'Charge Name', required: true, placeholder: 'e.g., Labour Welfare Cess' },
    {
        name: 'charge_type',
        label: 'Charge Type',
        type: 'select',
        defaultValue: 'Deduction',
        options: [
            { value: 'Deduction', label: 'Deduction' },
            { value: 'Recovery', label: 'Recovery' },
            { value: 'Levy', label: 'Levy' },
            { value: 'Addition', label: 'Addition' },
        ]
    },
    { name: 'rate_percentage', label: 'Rate (%)', type: 'number', step: '0.001', required: true, placeholder: 'e.g., 1.000' },
    {
        name: 'basis_of_calculation',
        label: 'Basis of Calculation',
        type: 'select',
        defaultValue: 'Gross Bill Value',
        options: [
            { value: 'Gross Bill Value', label: 'Gross Bill Value' },
            { value: 'Works Component Only', label: 'Works Component Only' },
            { value: 'Material Cost', label: 'Material Cost' },
            { value: 'Labour Cost', label: 'Labour Cost' },
            { value: 'Net Payable', label: 'Net Payable' },
        ]
    },
    { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
    { name: 'govt_reference', label: 'Govt. Reference', placeholder: 'Circular/Order number' },
    { name: 'account_head', label: 'Account Head/Ledger', placeholder: 'Finance code' },
    { name: 'is_active', label: 'Active', type: 'checkbox', checkboxLabel: 'Charge is currently active', defaultValue: true },
];
