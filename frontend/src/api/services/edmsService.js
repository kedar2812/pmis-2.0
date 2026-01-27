/**
 * EDMS Service - Document Management API
 * 
 * Provides functions for interacting with the Electronic Document Management System.
 * Supports smart routing via auto_route_category for automatic folder placement.
 */
import client from '@/api/client';

const edmsService = {
    /**
     * Upload a document with optional smart routing
     * 
     * @param {Object} options - Upload options
     * @param {number} options.projectId - Target project ID
     * @param {File} options.file - File to upload
     * @param {string} [options.title] - Document title (optional, defaults to filename)
     * @param {string} [options.description] - Document description
     * @param {string} [options.documentType='OTHER'] - Document type
     * @param {string} [options.folderId] - Manual folder selection (UUID)
     * @param {string} [options.autoRouteCategory] - Smart routing category (e.g., 'FUNDING_PROOF', 'RA_BILL')
     * @param {boolean} [options.isConfidential=false] - Mark as confidential
     * @param {Function} [options.onProgress] - Progress callback (percent)
     * @returns {Promise<Object>} Uploaded document data
     */
    uploadDocument: async ({
        projectId,
        file,
        title,
        description = '',
        documentType = 'OTHER',
        folderId = null,
        autoRouteCategory = null,
        isConfidential = false,
        onProgress = null,
    }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project', projectId);
        formData.append('document_type', documentType);
        formData.append('is_confidential', isConfidential);

        // Optional fields
        if (title) {
            formData.append('title', title);
        }
        if (description) {
            formData.append('description', description);
        }

        // Smart routing: auto_route_category takes precedence over manual folder
        if (autoRouteCategory) {
            formData.append('auto_route_category', autoRouteCategory);
        } else if (folderId) {
            formData.append('folder', folderId);
        }

        const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
        };

        if (onProgress) {
            config.onUploadProgress = (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            };
        }

        const response = await client.post('/edms/documents/', formData, config);
        return response.data;
    },

    /**
     * Upload multiple documents with smart routing
     * 
     * @param {Object} options - Batch upload options
     * @param {number} options.projectId - Target project ID
     * @param {Array<{file: File, title?: string}>} options.files - Files to upload
     * @param {string} options.autoRouteCategory - Smart routing category for all files
     * @param {string} [options.documentType='OTHER'] - Document type for all files
     * @returns {Promise<{success: number, failed: number, errors: Array}>}
     */
    uploadDocumentsBatch: async ({
        projectId,
        files,
        autoRouteCategory,
        documentType = 'OTHER',
    }) => {
        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };

        const uploadPromises = files.map(async ({ file, title }) => {
            try {
                await edmsService.uploadDocument({
                    projectId,
                    file,
                    title: title || file.name.replace(/\.[^/.]+$/, ''),
                    autoRouteCategory,
                    documentType,
                });
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    fileName: file.name,
                    error: error.response?.data?.error || error.message,
                });
            }
        });

        await Promise.all(uploadPromises);
        return results;
    },

    /**
     * Get documents for a project
     */
    getDocuments: async (projectId, params = {}) => {
        const response = await client.get('/edms/documents/', {
            params: { project: projectId, ...params }
        });
        return response.data;
    },

    /**
     * Get folders for a project
     */
    getFolders: async (projectId) => {
        const response = await client.get(`/edms/folders/?project=${projectId}`);
        return Array.isArray(response.data) ? response.data : (response.data.results || []);
    },

    /**
     * Get folder tree for a project
     */
    getFolderTree: async (projectId) => {
        const response = await client.get(`/edms/folders/tree/?project=${projectId}`);
        return response.data;
    },
};

export default edmsService;
