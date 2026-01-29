import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
console.log("🌐 Initializing API with base URL:", apiBase);

const API = axios.create({
    baseURL: apiBase,
    timeout: 60000, // 60 seconds
});

export const syncSheet = async (spreadsheetId) => {
    const response = await API.post('/sync', { spreadsheetId });
    return response.data;
};

export const getHistory = async () => {
    const response = await API.get('/history');
    return response.data;
};

export const getData = async (tableName, batchId) => {
    const response = await API.get(`/data/${tableName}`, {
        params: { batchId }
    });
    return response.data;
};

export const deleteRecord = async (tableName, id) => {
    const response = await API.delete(`/data/${tableName}/${id}`);
    return response.data;
};
