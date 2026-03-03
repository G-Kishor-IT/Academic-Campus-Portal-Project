// Main JavaScript for Academic Campus Event Portal

const API_BASE = '/api';

// Safe DOM helpers to avoid null access errors
function el(id) {
    return document.getElementById(id) || null;
}

function getValue(id, defaultValue = '') {
    const e = el(id);
    return e && (e.value !== undefined) ? e.value : defaultValue;
}

function setValue(id, value) {
    const e = el(id);
    if (e && (e.value !== undefined)) e.value = value;
}

function setText(id, text) {
    const e = el(id);
    if (e) e.textContent = text;
}

function addListener(id, event, handler) {
    const e = el(id);
    if (e) e.addEventListener(event, handler);
}

// expose helpers globally for older scripts
window.el = el;
window.getValue = getValue;
window.setValue = setValue;
window.setText = setText;
window.addListener = addListener;

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// API request helper
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            // use 'include' so cookies are sent for same-origin and cross-origin (when allowed)
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        const data = await response.json();

        // If unauthorized, redirect student pages to login for a better UX
        if (response.status === 401) {
            console.warn('API returned 401 Unauthorized');
            try {
                if (window.location.pathname.startsWith('/student')) {
                    window.location.href = '/student/login';
                }
            } catch (e) {}
            throw new Error(data.message || 'Unauthorized');
        }

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Check authentication status
async function checkAuth() {
    try {
        const data = await apiRequest(`${API_BASE}/auth/session`);
        return data.success ? data.user : null;
    } catch (error) {
        return null;
    }
}

// Logout function
async function logout() {
    try {
        await apiRequest(`${API_BASE}/auth/logout`, { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        showToast('Error logging out', 'error');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Get status badge class
function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'badge-pending',
        'approved': 'badge-approved',
        'rejected': 'badge-rejected',
        'active': 'badge-active',
        'cancelled': 'badge-cancelled'
    };
    return classes[status] || 'badge-pending';
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show loading spinner
function showLoading(element) {
    element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Academic Campus Event Portal loaded');
});
