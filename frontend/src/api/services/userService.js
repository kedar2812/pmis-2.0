import client from '../client';

const userService = {
    // Get all users
    getUsers: (params = {}) => client.get('/users/', { params }),

    // Get single user
    getUser: (id) => client.get(`/users/${id}/`),

    // Get current user profile
    getProfile: () => client.get('/users/profile/'),

    // Update user profile
    updateProfile: (data) => client.patch('/users/profile/', data),

    // Update user (admin)
    updateUser: (id, data) => client.patch(`/users/${id}/`, data),

    // Toggle user status
    toggleUserStatus: (id) => client.post(`/users/${id}/toggle-status/`),

    // Invite user
    inviteUser: (data) => client.post('/users/invite/', data),

    // Get pending users
    getPendingUsers: () => client.get('/users/pending/'),

    // Approve user
    approveUser: (id, data = {}) => client.post(`/users/${id}/approve/`, data),

    // Reject user
    rejectUser: (id, data = {}) => client.post(`/users/${id}/reject/`, data),

    // Get user by role
    getUsersByRole: (role) => client.get('/users/', { params: { role } }),

    // Get users eligible to be project managers (RBAC-based)
    getEligibleManagers: () => client.get('/users/eligible-managers/'),

    // Get roles summary (count users per role)
    getRolesSummary: async () => {
        const response = await client.get('/users/');
        const users = response.data.results || response.data || [];

        const roleCounts = {};
        users.forEach(user => {
            const role = user.role || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });

        return {
            data: Object.entries(roleCounts).map(([role, count]) => ({
                id: role.toLowerCase().replace(/\s+/g, '_'),
                name: role,
                count
            }))
        };
    }
};

export default userService;
