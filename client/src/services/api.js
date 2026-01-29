import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const API = axios.create({
    // If VITE_API_BASE_URL is set, use it. 
    // If NOT set: 
    //   - In production, use '/api' (same domain)
    //   - In development, use 'http://localhost:5000/api'
    baseURL: apiBase || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
    timeout: 150000,
});

console.log("🌐 API Base URL:", API.defaults.baseURL);

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
