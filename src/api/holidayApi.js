const BASE = '/api/holidays';
const token = () => sessionStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(url, { ...opts, headers: { 'Authorization': 'Bearer ' + token(), ...(opts.headers || {}) } });

export const fetchHolidays      = (year) => authFetch(`${BASE}?year=${year}`).then(r => r.json());
export const createHoliday      = (data) => authFetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteHoliday      = (id)   => authFetch(`${BASE}/${id}`, { method: 'DELETE' });
