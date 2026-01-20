import client from '../client';

// Transform frontend project data to backend format
const transformProjectData = (data) => {
    // Map camelCase frontend fields to snake_case backend fields
    const fieldMappings = {
        startDate: 'start_date',
        endDate: 'end_date',
        managerId: 'manager',
        subDivision: 'sub_division',
        schemeType: 'scheme_type',
        workType: 'work_type',
        projectCategory: 'project_category',
        adminApprovalNo: 'admin_approval_reference_no',
        adminApprovalDate: 'admin_approval_date',
    };

    // Fields to exclude (frontend-only fields)
    const excludeFields = ['displayName', 'zoneName', 'circleName', 'divisionName',
        'subDivisionName', 'districtName', 'townName', 'schemeTypeName',
        'schemeName', 'workTypeName', 'projectCategoryName', 'location',
        'stakeholders', 'category', 'fundingPattern', 'manager', 'progress', 'spent'];

    const transformed = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip excluded fields
        if (excludeFields.includes(key)) continue;

        // Apply field name mapping
        const newKey = fieldMappings[key] || key;

        // Skip empty values for optional fields
        if (value === '' || value === null || value === undefined) continue;

        transformed[newKey] = value;
    }

    // Handle fundings separately (transform from fundingPattern)
    if (data.fundingPattern && Array.isArray(data.fundingPattern)) {
        transformed.fundings = data.fundingPattern
            .filter(f => f.amount && parseFloat(f.amount) > 0)
            .map(f => ({
                source: f.source,
                amount: parseFloat(f.amount) || 0,
            }));
    }

    console.log('Transformed project data:', transformed);
    return transformed;
};

const projectService = {
    getAllProjects: async () => {
        const response = await client.get('/projects/');
        return response.data;
    },

    // Alias for getAllProjects (used by RiskManagement)
    getProjects: async () => {
        const response = await client.get('/projects/');
        return response;
    },

    getProjectById: async (id) => {
        const response = await client.get(`/projects/${id}/`);
        return response.data;
    },

    createProject: async (projectData) => {
        console.log('Original project data:', projectData);
        const transformedData = transformProjectData(projectData);
        const response = await client.post('/projects/', transformedData);
        return response.data;
    },

    updateProject: async (id, projectData) => {
        const response = await client.put(`/projects/${id}/`, projectData);
        return response.data;
    },

    deleteProject: async (id) => {
        const response = await client.delete(`/projects/${id}/`);
        return response.data;
    },

    // Work Packages
    getPackages: async (projectId) => {
        const response = await client.get(`/projects/packages/?project=${projectId}`);
        return response.data;
    },

    getWorkPackages: async () => {
        const response = await client.get('/projects/packages/');
        return response;
    },

    createPackage: async (packageData) => {
        const response = await client.post('/projects/packages/', packageData);
        return response.data;
    },

    createWorkPackage: async (packageData) => {
        const response = await client.post('/projects/packages/', packageData);
        return response.data;
    },

    updatePackage: async (id, packageData) => {
        const response = await client.put(`/projects/packages/${id}/`, packageData);
        return response.data;
    },

    deletePackage: async (id) => {
        const response = await client.delete(`/projects/packages/${id}/`);
        return response.data;
    }
};

export default projectService;

