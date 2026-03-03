// Admin JavaScript for Academic Campus Event Portal

// Admin login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = getValue('username');
            const password = getValue('password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            
            try {
                const data = await apiRequest('/api/auth/admin/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });
                
                showToast('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                }, 1000);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }
});

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const data = await apiRequest('/api/admin/dashboard');
        
        setText('totalEvents', data.stats.totalEvents);
        setText('totalRegistrations', data.stats.totalRegistrations);
        setText('pendingRegistrations', data.stats.pendingRegistrations);
        setText('totalStudents', data.stats.totalStudents);
    } catch (error) {
        showToast('Error loading dashboard stats', 'error');
    }
}

// Load events for admin
async function loadAdminEvents() {
    try {
        const data = await apiRequest('/api/admin/events');
        const eventsTable = document.getElementById('eventsTableBody');
        const eventsContainer = document.getElementById('eventsContainer');

        // If a table body exists (older admin page), render rows there
        if (eventsTable) {
            eventsTable.innerHTML = '';
            data.events.forEach(event => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${event.id}</td>
                    <td>${event.title}</td>
                    <td>${event.event_type || '-'}</td>
                    <td>${formatDate(event.event_date)}</td>
                    <td>${formatTime(event.event_time)}</td>
                    <td><span class="badge ${getStatusBadgeClass(event.status)}">${capitalize(event.status)}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="viewEventRegistrations(${event.id})">View</button>
                        <button class="btn btn-success btn-sm" onclick="exportRegistrations(${event.id})">Export</button>
                        <button class="btn btn-warning btn-sm" onclick="editEvent(${event.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">Delete</button>
                    </td>
                `;
                eventsTable.appendChild(row);
            });
            return;
        }

        // If the grid container exists (manage-events.html), render cards
        if (eventsContainer) {
            eventsContainer.innerHTML = '';
            data.events.forEach(event => {
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = `
                    <h3>${event.title}</h3>
                    <p class="event-meta">${event.event_type || '-'} • ${formatDate(event.event_date)} ${formatTime(event.event_time)}</p>
                    <p>${event.description || ''}</p>
                    <div class="event-actions">
                        <span class="status-badge ${getStatusBadgeClass(event.status)}">${capitalize(event.status)}</span>
                        <div style="margin-left:auto;display:flex;gap:6px;">
                            <button class="btn btn-primary btn-sm" onclick="viewEventRegistrations(${event.id})">View</button>
                            <button class="btn btn-success btn-sm" onclick="exportRegistrations(${event.id})">Export</button>
                            <button class="btn btn-warning btn-sm" onclick="editEvent(${event.id})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">Delete</button>
                        </div>
                    </div>
                `;
                eventsContainer.appendChild(card);
            });
            return;
        }
    } catch (error) {
        showToast('Error loading events', 'error');
    }
}

// Backwards-compatible wrapper used by some pages
function loadEvents() {
    return loadAdminEvents();
}

// Load registrations
async function loadRegistrations(eventId = null, status = null) {
    try {
        let url = '/api/admin/registrations?';
        if (eventId) url += `event_id=${eventId}&`;
        if (status) url += `status=${status}&`;
        
        const data = await apiRequest(url);
        const registrationsTable = document.getElementById('registrationsTableBody');
        
        if (!registrationsTable) return;
        
        registrationsTable.innerHTML = '';
        
        data.registrations.forEach(reg => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reg.full_name}</td>
                <td>${reg.email}</td>
                <td>${reg.student_id}</td>
                <td>${reg.department}</td>
                <td>${reg.event_title}</td>
                <td>${reg.team_name || '-'}</td>
                <td>${formatDate(reg.registration_date)}</td>
                <td><span class="badge ${getStatusBadgeClass(reg.status)}">${capitalize(reg.status)}</span></td>
                <td>
                    ${reg.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="updateRegistration(${reg.id}, 'approved')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="updateRegistration(${reg.id}, 'rejected')">Reject</button>
                    ` : ''}
                </td>
            `;
            registrationsTable.appendChild(row);
        });
    } catch (error) {
        showToast('Error loading registrations', 'error');
    }
}

// Update registration status
async function updateRegistration(id, status) {
    if (!confirm(`Are you sure you want to ${status} this registration?`)) return;
    
    try {
        await apiRequest(`/api/admin/registrations/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        showToast(`Registration ${status} successfully!`, 'success');
        loadRegistrations();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Export registrations to Excel
async function exportRegistrations(eventId) {
    try {
        const response = await fetch(`/api/admin/export/${eventId}`, { credentials: 'include' });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_registrations_${eventId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showToast('Excel file downloaded!', 'success');
    } catch (error) {
        showToast('Error exporting data', 'error');
    }
}

// Create new event
async function createEvent(eventData) {
    try {
        const data = await apiRequest('/api/admin/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
        
        showToast('Event created successfully!', 'success');
        loadAdminEvents();
        closeModal('eventModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Edit event
async function editEvent(id) {
    try {
        const data = await apiRequest('/api/admin/events');
        const event = data.events.find(e => e.id === id);
        
        if (!event) {
            showToast('Event not found', 'error');
            return;
        }
        
        setValue('eventId', event.id);
        setValue('eventTitle', event.title || '');
        setValue('eventDescription', event.description || '');
        setValue('eventType', event.event_type || '');
        setValue('eventLocation', event.location || '');
        setValue('eventDate', event.event_date || '');
        setValue('eventTime', event.event_time || '');
        setValue('eventDeadline', event.registration_deadline || '');
        setValue('eventMaxParticipants', event.max_participants || '');
        setValue('eventIsTeam', event.is_team_event == 1 ? '1' : '0');
        setValue('eventMaxTeamSize', event.max_team_size || 1);
        setValue('eventStatus', event.status || 'active');
        
        openModal('eventModal');
    } catch (error) {
        showToast('Error loading event', 'error');
    }
}

// Update event
async function updateEvent(id, eventData) {
    try {
        await apiRequest(`/api/admin/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
        
        showToast('Event updated successfully!', 'success');
        loadAdminEvents();
        closeModal('eventModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete event
async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event? All registrations will be deleted.')) return;
    
    try {
        await apiRequest(`/api/admin/events/${id}`, {
            method: 'DELETE'
        });
        
        showToast('Event deleted successfully!', 'success');
        loadAdminEvents();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// View event registrations
async function viewEventRegistrations(eventId) {
    window.location.href = `/admin/registrations?event_id=${eventId}`;
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Event listeners for modal
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Event form handler
const eventForm = document.getElementById('eventForm');
if (eventForm) {
    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const eventId = getValue('eventId');
        const eventData = {
            title: getValue('eventTitle'),
            description: getValue('eventDescription'),
            event_type: getValue('eventType'),
            location: getValue('eventLocation'),
            event_date: getValue('eventDate'),
            event_time: getValue('eventTime'),
            registration_deadline: getValue('eventDeadline'),
            max_participants: getValue('eventMaxParticipants'),
            is_team_event: getValue('eventIsTeam') === '1' ? 1 : 0,
            max_team_size: getValue('eventMaxTeamSize'),
            status: getValue('eventStatus')
        };
        
        if (eventId) {
            updateEvent(eventId, eventData);
        } else {
            createEvent(eventData);
        }
    });
}

// Filter registrations
const filterForm = document.getElementById('filterForm');
if (filterForm) {
    filterForm.addEventListener('change', () => {
        const eventId = document.getElementById('filterEvent').value;
        const status = document.getElementById('filterStatus').value;
        loadRegistrations(eventId || null, status || null);
    });
}
