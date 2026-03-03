// Student JavaScript for Academic Campus Event Portal

// Student registration
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('studentRegisterForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                studentId: document.getElementById('studentId').value,
                department: document.getElementById('department').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('password').value
            };
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';
            
            try {
                const data = await apiRequest('/api/auth/student/register', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                
                showToast('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = '/student/login';
                }, 1500);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register';
            }
        });
    }
});

// Student login
const studentLoginForm = document.getElementById('studentLoginForm');
if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = studentLoginForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        try {
            const data = await apiRequest('/api/auth/student/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            showToast('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = '/student/dashboard';
            }, 1000);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

// Load available events for students
async function loadStudentEvents() {
    try {
        const data = await apiRequest('/api/student/events');
        const eventsContainer = document.getElementById('eventsContainer');
        
        if (!eventsContainer) return;
        
        eventsContainer.innerHTML = '';
        
        if (data.events.length === 0) {
            eventsContainer.innerHTML = '<p>No events available at the moment.</p>';
            return;
        }
        
        // Get payment settings
        let paymentSettings = null;
        try {
            const paymentResponse = await fetch('/api/auth/payment-settings', { credentials: 'same-origin' });
            const paymentData = await paymentResponse.json();
            if (paymentData.success) {
                paymentSettings = paymentData.paymentSettings;
            }
        } catch (e) {
            console.log('Could not load payment settings');
        }
        
        data.events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            const feeDisplay = event.fee_per_person > 0 
                ? `<p class="event-meta"><strong>Fee per person:</strong> Rs. ${event.fee_per_person}</p>`
                : `<p class="event-meta"><strong>Fee:</strong> Free</p>`;
            
            card.innerHTML = `
                <div class="event-image">📅</div>
                <div class="event-content">
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-meta">
                        <strong>Date:</strong> ${formatDate(event.event_date)} | 
                        <strong>Time:</strong> ${formatTime(event.event_time)}
                    </p>
                    <p class="event-meta">
                        <strong>Location:</strong> ${event.location || 'TBA'}
                    </p>
                    <p class="event-meta">
                        <strong>Type:</strong> ${event.event_type || 'General'}
                        ${event.is_team_event ? ' | <strong>Team Event</strong> (Max ' + event.max_team_size + ' members)' : ' | <strong>Individual</strong>'}
                    </p>
                    ${feeDisplay}
                    <p>${event.description ? event.description.substring(0, 100) + '...' : ''}</p>
                    <div class="event-actions">
                        <button class="btn btn-primary" onclick="openRegistrationModal(${event.id}, '${event.title.replace(/'/g, "\\'")}', ${event.is_team_event}, ${event.max_team_size}, ${event.fee_per_person})">Register</button>
                    </div>
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    } catch (error) {
        showToast('Error loading events', 'error');
    }
}

// Open registration modal with payment details and team member boxes
async function openRegistrationModal(eventId, eventTitle, isTeamEvent, maxTeamSize, feePerPerson) {
    document.getElementById('registerEventId').value = eventId;
    document.getElementById('registerEventTitle').textContent = eventTitle;
    document.getElementById('isTeamEvent').value = isTeamEvent;
    document.getElementById('eventFeePerPerson').value = feePerPerson;
    document.getElementById('maxTeamSizeValue').value = maxTeamSize;
    document.getElementById('eventFee').textContent = feePerPerson;
    document.getElementById('maxTeamSize').textContent = maxTeamSize;
    
    // Reset payment confirmation
    document.getElementById('paymentConfirmed').checked = false;
    document.getElementById('submitBtn').disabled = true;
    
    // Fetch payment settings
    let paymentSettings = null;
    try {
        const response = await fetch('/api/auth/payment-settings', { credentials: 'same-origin' });
        const data = await response.json();
        if (data.success) {
            paymentSettings = data.paymentSettings;
        }
    } catch (e) {
        console.log('Could not load payment settings');
    }
    
    // Show payment info
    const paymentInfo = document.getElementById('paymentInfo');
    if (feePerPerson > 0 && paymentSettings) {
        paymentInfo.style.display = 'block';
        
        if (paymentSettings.upi_id) {
            document.getElementById('upiDetails').style.display = 'block';
            document.getElementById('upiIdDisplay').textContent = paymentSettings.upi_id;
        } else {
            document.getElementById('upiDetails').style.display = 'none';
        }
        
        if (paymentSettings.bank_name) {
            document.getElementById('bankDetails').style.display = 'block';
            document.getElementById('bankNameDisplay').textContent = paymentSettings.bank_name;
            document.getElementById('accountNumberDisplay').textContent = paymentSettings.account_number;
            document.getElementById('ifscCodeDisplay').textContent = paymentSettings.ifsc_code;
            document.getElementById('accountHolderDisplay').textContent = paymentSettings.account_holder_name;
        } else {
            document.getElementById('bankDetails').style.display = 'none';
        }
    } else {
        paymentInfo.style.display = 'none';
    }
    
    // Show appropriate fields based on event type
    if (isTeamEvent === 1) {
        document.getElementById('teamFields').style.display = 'block';
        document.getElementById('individualFields').style.display = 'none';
        document.getElementById('maxTeamSize').textContent = maxTeamSize;
        // Start with 2 members (leader + 1)
        window.teamMemberCount = 2;
        renderTeamMembers();
    } else {
        document.getElementById('teamFields').style.display = 'none';
        document.getElementById('individualFields').style.display = 'block';
        window.teamMemberCount = 1;
        calculateTotal();
    }
    
    document.getElementById('registerModal').style.display = 'flex';
}

// Render team member input boxes
function renderTeamMembers() {
    const container = document.getElementById('teamMembersContainer');
    container.innerHTML = '';
    const maxSize = parseInt(document.getElementById('maxTeamSizeValue').value) || 1;
    
    for (let i = 1; i <= window.teamMemberCount; i++) {
        const box = document.createElement('div');
        box.className = 'team-member-box';
        box.innerHTML = `
            <label style="font-weight: bold;">Team Member ${i} ${i === 1 ? '(You - Team Leader)' : ''}</label>
            <input type="text" id="teamMember${i}" placeholder="Enter name" required>
        `;
        container.appendChild(box);
    }
    calculateTotal();
}

// Add new team member
function addTeamMember() {
    const maxSize = parseInt(document.getElementById('maxTeamSizeValue').value) || 1;
    if (window.teamMemberCount < maxSize) {
        window.teamMemberCount++;
        renderTeamMembers();
    } else {
        alert('Maximum team size is ' + maxSize + ' members');
    }
}

// Calculate total amount based on fee per person × number of team members
function calculateTotal() {
    const feePerPerson = parseFloat(document.getElementById('eventFeePerPerson').value) || 0;
    const total = feePerPerson * window.teamMemberCount;
    document.getElementById('totalAmount').textContent = total;
    document.getElementById('confirmAmount').textContent = total;
}

// Update submit button based on payment checkbox
function updateSubmitButton() {
    const isChecked = document.getElementById('paymentConfirmed').checked;
    document.getElementById('submitBtn').disabled = !isChecked;
}

// Submit event registration
async function submitRegistration() {
    const eventId = document.getElementById('registerEventId').value;
    const isTeamEvent = document.getElementById('isTeamEvent').value;
    const teamName = document.getElementById('teamName').value;
    const feePerPerson = parseFloat(document.getElementById('eventFeePerPerson').value) || 0;
    
    let teamMembers = [];
    
    if (isTeamEvent === '1' || isTeamEvent === 1) {
        // Collect team member names from individual boxes
        for (let i = 1; i <= window.teamMemberCount; i++) {
            const memberName = document.getElementById(`teamMember${i}`).value.trim();
            if (!memberName) {
                alert(`Please enter name for Team Member ${i}`);
                return;
            }
            teamMembers.push(memberName);
        }
        
        if (!teamName) {
            alert('Please enter a team name');
            return;
        }
    } else {
        // Individual registration - get user name from session
        try {
            const sessionData = await apiRequest('/api/auth/session');
            if (sessionData.success && sessionData.user) {
                teamMembers = [sessionData.user.full_name];
            }
        } catch (e) {
            console.error('Error getting session:', e);
        }
    }
    
    const paymentConfirmed = document.getElementById('paymentConfirmed').checked;
    if (!paymentConfirmed) {
        alert('Please confirm that you have made the payment');
        return;
    }
    
    const totalAmount = feePerPerson * window.teamMemberCount;
    
    try {
        const data = await apiRequest('/api/student/register-event', {
            method: 'POST',
            body: JSON.stringify({
                event_id: eventId,
                team_name: teamName || null,
                team_members: teamMembers,
                is_team_event: isTeamEvent === '1' || isTeamEvent === 1,
                payment_amount: totalAmount
            })
        });
        
        if (data.success) {
            alert('Registration submitted successfully! Admin will verify your registration after payment confirmation.');
            closeModal('registerModal');
            
            // Reset form
            document.getElementById('teamName').value = '';
            document.getElementById('teamMembersContainer').innerHTML = '';
            document.getElementById('paymentConfirmed').checked = false;
            document.getElementById('submitBtn').disabled = true;
            
            loadMyRegistrations();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        alert('Error submitting registration: ' + error.message);
    }
}

// Load my registrations with payment status
async function loadMyRegistrations() {
    try {
        const data = await apiRequest('/api/student/my-registrations');
        const registrationsContainer = document.getElementById('myRegistrations');
        
        if (!registrationsContainer) return;
        
        registrationsContainer.innerHTML = '';
        
        if (data.registrations.length === 0) {
            registrationsContainer.innerHTML = '<p>You have not registered for any events yet.</p>';
            return;
        }
        
        data.registrations.forEach(reg => {
            let teamMembersHtml = '';
            if (reg.team_members) {
                try {
                    const members = JSON.parse(reg.team_members);
                    if (Array.isArray(members)) {
                        teamMembersHtml = `<p><strong>Team Members:</strong> ${members.join(', ')}</p>`;
                    }
                } catch (e) {
                    teamMembersHtml = `<p><strong>Team Members:</strong> ${reg.team_members}</p>`;
                }
            }
            
            // Payment status badge
            const paymentStatusBadge = getPaymentStatusBadge(reg.payment_status);
            
            // Payment button
            let paymentButton = '';
            if (reg.payment_status === 'unpaid' && reg.payment_amount > 0) {
                paymentButton = `<button class="btn btn-primary" onclick="openPaymentModal(${reg.id})" style="margin-right: 0.5rem;">Pay Now (₹${reg.payment_amount})</button>`;
            }
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${reg.event_title}</h3>
                <p><strong>Event Date:</strong> ${formatDate(reg.event_date)} at ${formatTime(reg.event_time)}</p>
                <p><strong>Location:</strong> ${reg.location || 'TBA'}</p>
                <p><strong>Event Type:</strong> ${reg.event_type || 'General'}</p>
                ${reg.team_name ? `<p><strong>Team Name:</strong> ${reg.team_name}</p>` : ''}
                ${teamMembersHtml}
                <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(reg.status)}">${capitalize(reg.status)}</span></p>
                <p><strong>Payment:</strong> ${paymentStatusBadge} ${reg.payment_amount > 0 ? `(₹${reg.payment_amount})` : ''}</p>
                <p><strong>Registered On:</strong> ${formatDate(reg.registration_date)}</p>
                ${reg.notes ? `<p><strong>Notes:</strong> ${reg.notes}</p>` : ''}
                <div style="margin-top: 1rem;">
                    ${paymentButton}
                    ${reg.status === 'pending' ? `
                        <button class="btn btn-danger" onclick="cancelRegistration(${reg.id})">Cancel Registration</button>
                    ` : ''}
                </div>
            `;
            registrationsContainer.appendChild(card);
        });
    } catch (error) {
        showToast('Error loading registrations', 'error');
    }
}

// Get payment status badge HTML
function getPaymentStatusBadge(status) {
    switch(status) {
        case 'paid':
            return '<span class="payment-badge paid">✓ Paid</span>';
        case 'unpaid':
            return '<span class="payment-badge unpaid">⚠ Unpaid</span>';
        case 'refunded':
            return '<span class="payment-badge" style="background: #e0e0e0; color: #666;">↩ Refunded</span>';
        default:
            return '<span class="payment-badge unpaid">⚠ Unpaid</span>';
    }
}

// Cancel registration
async function cancelRegistration(id) {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    
    try {
        await apiRequest(`/api/student/registrations/${id}`, {
            method: 'DELETE'
        });
        
        showToast('Registration cancelled successfully', 'success');
        loadMyRegistrations();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load student profile
async function loadStudentProfile() {
    try {
        const data = await apiRequest('/api/student/profile');
        
        if (data.success && data.profile) {
            document.getElementById('profileName').textContent = data.profile.full_name;
            document.getElementById('profileEmail').textContent = data.profile.email;
            document.getElementById('profileStudentId').textContent = data.profile.student_id;
            document.getElementById('profileDepartment').textContent = data.profile.department || 'Not specified';
            document.getElementById('profilePhone').textContent = data.profile.phone || 'Not specified';
        }
    } catch (error) {
        showToast('Error loading profile', 'error');
    }
}

// Update profile form
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            full_name: document.getElementById('profileFullName').value,
            department: document.getElementById('profileDepartment').value,
            phone: document.getElementById('profilePhone').value
        };
        
        try {
            const data = await apiRequest('/api/student/profile', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            showToast('Profile updated successfully', 'success');
            loadStudentProfile();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
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
