import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Attach latest token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong';

    if (err.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(err);
  }
);

// Goals
export const getMyGoals = (cycle) =>
  api.get('/api/goals/my', { params: { cycle } });

export const saveGoals = (data) =>
  api.put('/api/goals/my', data);

export const submitGoals = (cycle) =>
  api.post('/api/goals/submit', { cycle });

export const getGoalSheet = (id) =>
  api.get(`/api/goals/${id}`);

export const approveGoalSheet = (id, data) =>
  api.put(`/api/goals/${id}/approve`, data);

export const updateAchievement = (id, data) =>
  api.put(`/api/goals/${id}/achievement`, data);

export const shareGoal = (data) =>
  api.post('/api/goals/share', data);

export const unlockGoalSheet = (id, reason) =>
  api.post(`/api/goals/${id}/unlock`, { reason });

export const getTeamGoals = (params) =>
  api.get('/api/goals/team', { params });

// Check-ins
export const submitCheckin = (sheetId, data) =>
  api.post(`/api/checkins/${sheetId}`, data);

export const getTeamCheckinStatus = (params) =>
  api.get('/api/checkins/team/status', { params });

// Reports
export const getAchievementReport = (params) =>
  api.get('/api/reports/achievement', { params });

export const getCompletionReport = (params) =>
  api.get('/api/reports/completion', { params });

export const getAnalytics = (params) =>
  api.get('/api/reports/analytics', { params });

// Admin
export const getCycleConfig = (year) =>
  api.get('/api/admin/cycle', { params: { year } });

export const updateCycleConfig = (data) =>
  api.put('/api/admin/cycle', data);

export const getUsers = (params) =>
  api.get('/api/admin/users', { params });

export const createUser = (data) =>
  api.post('/api/admin/users', data);

export const updateUser = (id, data) =>
  api.put(`/api/admin/users/${id}`, data);

export const getAuditLog = (params) =>
  api.get('/api/admin/audit', { params });

export const broadcastNotification = (data) =>
  api.post('/api/admin/broadcast', data);

// Notifications
export const getNotifications = () =>
  api.get('/api/notifications');

export const markAllRead = () =>
  api.put('/api/notifications/read-all');

export const markRead = (id) =>
  api.put(`/api/notifications/${id}/read`);

// AI
export const analyzeGoal = (goal) =>
  api.post('/api/ai/analyze-goal', { goal });

export const suggestGoals = (data) =>
  api.post('/api/ai/suggest-goals', data);

export const getProgressInsight = (sheetId, quarter) =>
  api.post('/api/ai/progress-insight', { sheetId, quarter });

// Users
export const getTeamMembers = () =>
  api.get('/api/users/team');

export const getManagers = () =>
  api.get('/api/users/managers');

// Sync axios instance with token changes
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};