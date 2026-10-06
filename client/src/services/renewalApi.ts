import api from './api';

const masters = {
  categories: {
    list: (params?: any) => api.get('/renewal-masters/categories', { params }).then(r => r.data),
    all: () => api.get('/renewal-masters/all-categories').then(r => r.data),
    create: (data: any) => api.post('/renewal-masters/categories', data),
    update: (id: number, data: any) => api.put(`/renewal-masters/categories/${id}`, data),
    delete: (id: number) => api.delete(`/renewal-masters/categories/${id}`),
  },
  services: {
    list: (params?: any) => api.get('/renewal-masters/services', { params }).then(r => r.data),
    get: (id: number) => api.get(`/renewal-masters/services/${id}`).then(r => r.data),
    create: (data: any) => api.post('/renewal-masters/services', data),
    update: (id: number, data: any) => api.put(`/renewal-masters/services/${id}`, data),
    delete: (id: number) => api.delete(`/renewal-masters/services/${id}`),
  },
  providers: {
    list: () => api.get('/renewal-masters/providers').then(r => r.data),
    create: (data: any) => api.post('/renewal-masters/providers', data),
    update: (id: number, data: any) => api.put(`/renewal-masters/providers/${id}`, data),
    delete: (id: number) => api.delete(`/renewal-masters/providers/${id}`),
  },
  contacts: {
    list: (params: any) => api.get('/renewal-masters/contacts', { params }).then(r => r.data),
    create: (data: any) => api.post('/renewal-masters/contacts', data),
    update: (id: number, data: any) => api.put(`/renewal-masters/contacts/${id}`, data),
    delete: (id: number) => api.delete(`/renewal-masters/contacts/${id}`),
  },
};

const renewals = {
  list: (params?: any) => api.get('/renewals', { params }).then(r => r.data),
  get: (id: number) => api.get(`/renewals/${id}`).then(r => r.data),
  create: (data: any) => api.post('/renewals', data),
  update: (id: number, data: any) => api.put(`/renewals/${id}`, data),
  delete: (id: number) => api.delete(`/renewals/${id}`),
  activate: (id: number) => api.post(`/renewals/${id}/activate`),
  dashboard: (params?: any) => api.get('/renewals/dashboard', { params }).then(r => r.data),
  previewReminders: (params: any) => api.get('/renewals/preview-reminders', { params }).then(r => r.data),
};

const pricing = {
  mappings: {
    list: (params?: any) => api.get('/renewal-pricing/mappings', { params }).then(r => r.data),
    get: (id: number) => api.get(`/renewal-pricing/mappings/${id}`).then(r => r.data),
    create: (data: any) => api.post('/renewal-pricing/mappings', data),
    update: (id: number, data: any) => api.put(`/renewal-pricing/mappings/${id}`, data),
    updateAlertSteps: (id: number, steps: any[]) => api.put(`/renewal-pricing/mappings/${id}/alert-steps`, { steps }),
  },
  customerPrice: (clientId: number, serviceId: number) =>
    api.get(`/renewal-pricing/customer/${clientId}/service/${serviceId}`).then(r => r.data),
  defaultPrices: (serviceId: number) =>
    api.get(`/renewal-pricing/service/${serviceId}/prices`).then(r => r.data),
  drafts: {
    list: (params?: any) => api.get('/renewal-pricing/drafts', { params }).then(r => r.data),
    approve: (id: number) => api.post(`/renewal-pricing/drafts/${id}/approve`),
    skip: (id: number) => api.post(`/renewal-pricing/drafts/${id}/skip`),
    approveBulk: (ids: number[]) => api.post('/renewal-pricing/drafts/approve-bulk', { ids }),
  },
};

const followups = {
  counts: () => api.get('/renewal-followups/counts').then(r => r.data),
  list: (params?: any) => api.get('/renewal-followups', { params }).then(r => r.data),
  complete: (reminderId: number, body: any) => api.post(`/renewal-followups/${reminderId}/complete`, body),
  skip: (reminderId: number, body?: any) => api.post(`/renewal-followups/${reminderId}/skip`, body),
};

const templates = {
  list: (params?: any) => api.get('/renewal-templates', { params }).then(r => r.data),
  builder: {
    get: (id: number) => api.get(`/renewal-templates/${id}/builder`).then(r => r.data),
    update: (id: number, data: any) => api.put(`/renewal-templates/${id}/builder`, data),
    preview: (id: number, compiledHtml: string) =>
      api.post(`/renewal-templates/${id}/builder/preview`, { compiled_html: compiledHtml }),
  },
  tokens: () => api.get('/renewal-templates/tokens').then(r => r.data),
};

const settings = {
  policies: {
    list: (params?: any) => api.get('/renewal-settings/policies', { params }).then(r => r.data),
  },
};

const notifications = {
  unreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
};

export const renewalApi = {
  masters,
  renewals,
  pricing,
  followups,
  templates,
  settings,
  notifications,
};
