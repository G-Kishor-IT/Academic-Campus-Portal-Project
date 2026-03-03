const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to check if student is logged in
const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'student') {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Get all available events (public - no login required)
router.get('/events', (req, res) => {
    // Show active events. Removed strict registration_deadline filter so existing sample events are visible.
    const query = 'SELECT * FROM events WHERE status = "active" ORDER BY event_date ASC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching events' });
        }
        res.json({ success: true, events: results });
    });
});

// Get single event details with payment info
router.get('/events/:id', isStudent, (req, res) => {
    const { id } = req.params;
    
    const eventQuery = 'SELECT * FROM events WHERE id = ?';
    db.query(eventQuery, [id], (err, eventResults) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching event' });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        // Get payment settings
        const paymentQuery = 'SELECT * FROM payment_settings WHERE is_active = 1 LIMIT 1';
        db.query(paymentQuery, (err, paymentResults) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching payment settings' });
            }
            
            res.json({ 
                success: true, 
                event: eventResults[0],
                paymentSettings: paymentResults[0] || null
            });
        });
    });
});

// Register for an event (with payment)
router.post('/register-event', isStudent, (req, res) => {
    const { event_id, team_name, team_members, is_team_event } = req.body;
    const user_id = req.session.user.id;
    
    if (!event_id) {
        return res.status(400).json({ success: false, message: 'Please select an event' });
    }
    
    // Check if already registered
    const checkQuery = 'SELECT id FROM registrations WHERE event_id = ? AND user_id = ?';
    db.query(checkQuery, [event_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'You have already registered for this event' });
        }
        
        // Get event details including fee
        const eventQuery = 'SELECT * FROM events WHERE id = ?';
        db.query(eventQuery, [event_id], (err, eventResults) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error checking event' });
            }
            
            if (eventResults.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }
            
            const event = eventResults[0];
            
            // Check event capacity
            const countQuery = 'SELECT COUNT(*) as current_count FROM registrations WHERE event_id = ? AND status != "rejected"';
            db.query(countQuery, [event_id], (err, countResults) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error checking capacity' });
                }
                
                if (event.max_participants && countResults[0].current_count >= event.max_participants) {
                    return res.status(400).json({ success: false, message: 'Event is full' });
                }
                
                // Calculate payment amount
                let teamSize = 1;
                if (event.is_team_event && team_members && Array.isArray(team_members)) {
                    // frontend sends an array with all team members (including leader), so use its length directly
                    teamSize = team_members.length;
                }
                const paymentAmount = event.fee_per_person * teamSize;
                
                // Create registration with payment amount
                const teamMembersStr = team_members ? JSON.stringify(team_members) : null;
                const notes = `Payment Amount: Rs. ${paymentAmount}`;
                
                // Insert registration - payment status will be unpaid initially
                const insertQuery = 'INSERT INTO registrations (event_id, user_id, team_name, team_members, status, payment_status, payment_amount, notes) VALUES (?, ?, ?, ?, "pending", "unpaid", ?, ?)';
                db.query(insertQuery, [event_id, user_id, team_name || null, teamMembersStr, paymentAmount, notes], (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error registering for event' });
                    }
                    
                    // Get payment settings to return with response
                    const paymentQuery = 'SELECT * FROM payment_settings WHERE is_active = 1 LIMIT 1';
                    db.query(paymentQuery, (err, paymentResults) => {
                        const paymentSettings = paymentResults[0] || null;
                        
                        res.json({ 
                            success: true, 
                            message: 'Registration submitted successfully! Please complete payment.',
                            registrationId: result.insertId,
                            paymentAmount: paymentAmount,
                            paymentSettings: paymentSettings,
                            event: event
                        });
                    });
                });
            });
        });
    });
});

// Submit payment details
router.post('/submit-payment', isStudent, (req, res) => {
    const { registration_id, payment_method, transaction_id } = req.body;
    const user_id = req.session.user.id;
    
    if (!registration_id || !payment_method) {
        return res.status(400).json({ success: false, message: 'Please provide payment details' });
    }
    
    // Verify registration belongs to this student
    const checkQuery = 'SELECT r.*, e.fee_per_person, e.is_team_event FROM registrations r JOIN events e ON r.event_id = e.id WHERE r.id = ? AND r.user_id = ?';
    db.query(checkQuery, [registration_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error verifying registration' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        
        const registration = results[0];
        
        // Calculate correct amount based on team size
        let teamSize = 1;
        if (registration.is_team_event && registration.team_members) {
            try {
                const teamMembers = JSON.parse(registration.team_members);
                teamSize = Array.isArray(teamMembers) ? teamMembers.length : 1;
            } catch(e) {}
        }
        const paymentAmount = registration.fee_per_person * teamSize;
        
        // Update payment status
        const updateQuery = 'UPDATE registrations SET payment_status = "paid", payment_method = ?, payment_transaction_id = ?, payment_amount = ?, payment_date = NOW() WHERE id = ?';
        db.query(updateQuery, [payment_method, transaction_id || '', paymentAmount, registration_id], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating payment' });
            }
            res.json({ success: true, message: 'Payment submitted successfully! Your registration is now pending approval.' });
        });
    });
});

// Get payment details for a registration
router.get('/registration/:id/payment', isStudent, (req, res) => {
    const { id } = req.params;
    const user_id = req.session.user.id;
    
    const query = `
        SELECT r.*, e.title as event_title, e.fee_per_person, e.is_team_event, e.event_date, e.location 
        FROM registrations r 
        JOIN events e ON r.event_id = e.id 
        WHERE r.id = ? AND r.user_id = ?
    `;
    
    db.query(query, [id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching registration' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        
        // Get payment settings
        db.query('SELECT * FROM payment_settings WHERE is_active = 1 LIMIT 1', (err, paymentSettings) => {
            res.json({ 
                success: true, 
                registration: results[0],
                paymentSettings: paymentSettings[0] || null
            });
        });
    });
});

// Get my registrations
router.get('/my-registrations', isStudent, (req, res) => {
    const user_id = req.session.user.id;
    
    const query = `
        SELECT r.*, e.title as event_title, e.event_date, e.event_time, e.location, e.event_type
        FROM registrations r 
        JOIN events e ON r.event_id = e.id 
        WHERE r.user_id = ?
        ORDER BY r.registration_date DESC
    `;
    
    db.query(query, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching registrations' });
        }
        res.json({ success: true, registrations: results });
    });
});

// Cancel registration
router.delete('/registrations/:id', isStudent, (req, res) => {
    const { id } = req.params;
    const user_id = req.session.user.id;
    
    const query = 'DELETE FROM registrations WHERE id = ? AND user_id = ?';
    db.query(query, [id, user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error cancelling registration' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        res.json({ success: true, message: 'Registration cancelled successfully' });
    });
});

// Get student profile
router.get('/profile', isStudent, (req, res) => {
    const user_id = req.session.user.id;
    const query = 'SELECT id, username, email, full_name, student_id, department, phone, created_at FROM users WHERE id = ?';
    db.query(query, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching profile' });
        }
        res.json({ success: true, profile: results[0] });
    });
});

// Update student profile
router.put('/profile', isStudent, (req, res) => {
    const user_id = req.session.user.id;
    const { full_name, department, phone } = req.body;
    
    const query = 'UPDATE users SET full_name = ?, department = ?, phone = ? WHERE id = ?';
    db.query(query, [full_name, department, phone, user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating profile' });
        }
        req.session.user.full_name = full_name;
        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

module.exports = router;
