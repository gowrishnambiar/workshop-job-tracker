// Tools I need
import { API } from './statuses.js';

// HELPER: Call the backend (used by every request)
export function api(path, token, method = 'GET', body = null) {
    const options = { method: method, headers: {'Content-Type': 'application/json' } };
    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (body) options.body = JSON.stringify(body);
    return fetch(API + path, options).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.status === 204 ? null : response.json();
    });
}