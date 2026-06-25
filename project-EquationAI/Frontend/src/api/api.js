import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadEquationFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};


export const convertLatexToMathml = async (latex) => {
  const response = await api.post('/convert/latex-to-mathml', { latex });
  return response.data;
};

export const convertMathmlToLatex = async (mathml) => {
  const response = await api.post('/convert/mathml-to-latex', { mathml });
  return response.data;
};

export const querySemanticSearch = async (query) => {
  const response = await api.post('/semantic-search', { query });
  return response.data;
};

// ──────────────────────────────────────────────
//  Handwriting Recognition
// ──────────────────────────────────────────────

export const recognizeHandwriting = async (imageBase64) => {
  const response = await api.post('/handwriting/recognize', { image: imageBase64 });
  return response.data;
};

// ──────────────────────────────────────────────
//  History API
// ──────────────────────────────────────────────

export const getHistory = async (source = null, search = null) => {
  const params = {};
  if (source) params.source = source;
  if (search) params.search = search;
  const response = await api.get('/history', { params });
  return response.data;
};

export const createHistoryEntry = async ({ latex, mathml, source, fileName }) => {
  const response = await api.post('/history', { latex, mathml, source, fileName });
  return response.data;
};

export const deleteHistoryEntryApi = async (entryId) => {
  const response = await api.delete(`/history/${entryId}`);
  return response.data;
};

export const clearHistoryApi = async () => {
  const response = await api.delete('/history');
  return response.data;
};

// ──────────────────────────────────────────────
//  Stats / Overview
// ──────────────────────────────────────────────

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// ──────────────────────────────────────────────
//  Health Check
// ──────────────────────────────────────────────

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;