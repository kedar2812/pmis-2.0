import client from '../client';

const mastersService = {
    // ========== Hierarchy ==========
    // Zones
    getZones: () => client.get('/masters/zones/'),
    getZone: (id) => client.get(`/masters/zones/${id}/`),
    createZone: (data) => client.post('/masters/zones/', data),
    updateZone: (id, data) => client.patch(`/masters/zones/${id}/`, data),
    deleteZone: (id) => client.delete(`/masters/zones/${id}/`),
    getZoneCircles: (zoneId) => client.get(`/masters/zones/${zoneId}/circles/`),

    // Circles
    getCircles: (params = {}) => client.get('/masters/circles/', { params }),
    getCircle: (id) => client.get(`/masters/circles/${id}/`),
    createCircle: (data) => client.post('/masters/circles/', data),
    updateCircle: (id, data) => client.patch(`/masters/circles/${id}/`, data),
    deleteCircle: (id) => client.delete(`/masters/circles/${id}/`),
    getCircleDivisions: (circleId) => client.get(`/masters/circles/${circleId}/divisions/`),

    // Divisions
    getDivisions: (params = {}) => client.get('/masters/divisions/', { params }),
    getDivision: (id) => client.get(`/masters/divisions/${id}/`),
    createDivision: (data) => client.post('/masters/divisions/', data),
    updateDivision: (id, data) => client.patch(`/masters/divisions/${id}/`, data),
    deleteDivision: (id) => client.delete(`/masters/divisions/${id}/`),
    getDivisionSubDivisions: (divId) => client.get(`/masters/divisions/${divId}/subdivisions/`),

    // SubDivisions
    getSubDivisions: (params = {}) => client.get('/masters/subdivisions/', { params }),
    getSubDivision: (id) => client.get(`/masters/subdivisions/${id}/`),
    createSubDivision: (data) => client.post('/masters/subdivisions/', data),
    updateSubDivision: (id, data) => client.patch(`/masters/subdivisions/${id}/`, data),
    deleteSubDivision: (id) => client.delete(`/masters/subdivisions/${id}/`),

    // ========== Geography ==========
    // Districts
    getDistricts: (params = {}) => client.get('/masters/districts/', { params }),
    getDistrict: (id) => client.get(`/masters/districts/${id}/`),
    createDistrict: (data) => client.post('/masters/districts/', data),
    updateDistrict: (id, data) => client.patch(`/masters/districts/${id}/`, data),
    deleteDistrict: (id) => client.delete(`/masters/districts/${id}/`),
    getDistrictTowns: (distId) => client.get(`/masters/districts/${distId}/towns/`),

    // Towns
    getTowns: (params = {}) => client.get('/masters/towns/', { params }),
    getTown: (id) => client.get(`/masters/towns/${id}/`),
    createTown: (data) => client.post('/masters/towns/', data),
    updateTown: (id, data) => client.patch(`/masters/towns/${id}/`, data),
    deleteTown: (id) => client.delete(`/masters/towns/${id}/`),

    // ========== Classification ==========
    // Scheme Types
    getSchemeTypes: () => client.get('/masters/scheme-types/'),
    getSchemeType: (id) => client.get(`/masters/scheme-types/${id}/`),
    createSchemeType: (data) => client.post('/masters/scheme-types/', data),
    updateSchemeType: (id, data) => client.patch(`/masters/scheme-types/${id}/`, data),
    deleteSchemeType: (id) => client.delete(`/masters/scheme-types/${id}/`),

    // Schemes
    getSchemes: (params = {}) => client.get('/masters/schemes/', { params }),
    getScheme: (id) => client.get(`/masters/schemes/${id}/`),
    createScheme: (data) => client.post('/masters/schemes/', data),
    updateScheme: (id, data) => client.patch(`/masters/schemes/${id}/`, data),
    deleteScheme: (id) => client.delete(`/masters/schemes/${id}/`),

    // Work Types
    getWorkTypes: () => client.get('/masters/work-types/'),
    getWorkType: (id) => client.get(`/masters/work-types/${id}/`),
    createWorkType: (data) => client.post('/masters/work-types/', data),
    updateWorkType: (id, data) => client.patch(`/masters/work-types/${id}/`, data),
    deleteWorkType: (id) => client.delete(`/masters/work-types/${id}/`),

    // Project Categories
    getProjectCategories: () => client.get('/masters/project-categories/'),
    getProjectCategory: (id) => client.get(`/masters/project-categories/${id}/`),
    createProjectCategory: (data) => client.post('/masters/project-categories/', data),
    updateProjectCategory: (id, data) => client.patch(`/masters/project-categories/${id}/`, data),
    deleteProjectCategory: (id) => client.delete(`/masters/project-categories/${id}/`),
    // Auto-categorization based on contract value
    suggestProjectCategory: (contractValue) => client.get('/masters/project-categories/suggest_category/', {
        params: { contract_value: contractValue }
    }),

    // ========== Entities ==========
    // Contractors
    getContractors: (params = {}) => client.get('/masters/contractors/', { params }),
    getActiveContractors: () => client.get('/masters/contractors/active/'),
    getContractor: (id) => client.get(`/masters/contractors/${id}/`),
    createContractor: (data) => client.post('/masters/contractors/', data),
    updateContractor: (id, data) => client.patch(`/masters/contractors/${id}/`, data),
    deleteContractor: (id) => client.delete(`/masters/contractors/${id}/`),
    syncContractorsFromUsers: () => client.post('/masters/contractors/sync_from_users/'),

    // ========== Finance Config ==========
    // ETP Charges
    getETPCharges: (params = {}) => client.get('/masters/etp-charges/', { params }),
    getActiveETPCharges: () => client.get('/masters/etp-charges/active/'),
    getDeductions: () => client.get('/masters/etp-charges/deductions/'),
    getRecoveries: () => client.get('/masters/etp-charges/recoveries/'),
    getETPCharge: (id) => client.get(`/masters/etp-charges/${id}/`),
    createETPCharge: (data) => client.post('/masters/etp-charges/', data),
    updateETPCharge: (id, data) => client.patch(`/masters/etp-charges/${id}/`, data),
    deleteETPCharge: (id) => client.delete(`/masters/etp-charges/${id}/`),
};

export default mastersService;
