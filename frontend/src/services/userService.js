import api from '@/api/client';

const userService = {
    getUsers: async () => {
        const response = await api.get('/users/'); // Assuming /users/ endpoint lists users
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/users/me/');
        return response.data;
    }
};

export default userService;
