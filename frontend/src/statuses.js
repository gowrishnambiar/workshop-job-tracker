// SETTING: backend address (onlineL VITE_API_URL / local: 127.0.0.1:8000)
export const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


// SETTING: The 6 statuses, in order
export const STATUSES = ['Received', 'Checking', 'Waiting for parts', 'Repairing', 'Ready for pickup', 'Collected'];


// SETTING: The colour for each status
export const COLOURS = {
    'Received': 'received',
    'Checking': 'checking',
    'Waiting for parts': 'waiting',
    'Repairing': 'repairing',
    'Ready for pickup': 'ready',
    'Collected': 'collected'
};


// SETTING: SST Rate (change here if the government changes it)
export const SST_RATE = 0.08;


