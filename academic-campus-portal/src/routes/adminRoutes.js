const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ExcelJS = require('exceljs');

// Middleware to check if admin is logged in
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Get dashboard statistics
router.get('/dashboard', isAdmin, (req, res) => {
    const stats = {};
    
    const queries = [
        'SELECT COUNT(*) as totalEvents FROM events',
        'SELECT COUNT(*) as totalRegistrations FROM registrations',
        'SELECT COUNT(*) as pendingRegistrations FROM registrations WHERE status = "pending"',
        'SELECT COUNT(*) as totalStudents FROM users WHERE role = "student"'
    ];

    let completed = 0;
    queries.forEach((query, index) => {
        db.query(query, (err, results) => {
            if (err) console.error(err);
            if (index === 0) stats.totalEvents = results[0].totalEvents;
            if (index === 1) stats.totalRegistrations = results[0].totalRegistrations;
            if (index === 2) stats.pendingRegistrations = results[0].pendingRegistrations;
            if (index === 3) stats.totalStudents = results[0].totalStudents;
            
            completed++;
            if (completed === queries.length) {
                res.json({ success: true, stats });
            }
        });
    });
});

// Get all events
router.get('/events', isAdmin, (req, res) => {
    const query = 'SELECT * FROM events ORDER BY event_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching events' });
        }
        res.json({ success: true, events: results });
    });
});

// Create new event
router.post('/events', isAdmin, (req, res) => {
    const { title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person } = req.body;
    
    if (!title || !event_date || !event_time) {
        return res.status(400).json({ success: false, message: 'Please provide required fields' });
    }

    const query = 'INSERT INTO events (title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event || 0, max_team_size || 1, fee_per_person || 0, req.session.user.id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating event' });
        }
        res.json({ success: true, message: 'Event created successfully', eventId: result.insertId });
    });
});

// Update event
router.put('/events/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person, status } = req.body;
    
    const query = 'UPDATE events SET title = ?, description = ?, event_type = ?, location = ?, event_date = ?, event_time = ?, registration_deadline = ?, max_participants = ?, is_team_event = ?, max_team_size = ?, fee_per_person = ?, status = ? WHERE id = ?';
    db.query(query, [title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person, status, id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating event' });
        }
        res.json({ success: true, message: 'Event updated successfully' });
    });
});

// Get payment settings
router.get('/payment-settings', isAdmin, (req, res) => {
    const query = 'SELECT * FROM payment_settings WHERE is_active = 1 LIMIT 1';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching payment settings' });
        }
        res.json({ success: true, paymentSettings: results[0] || null });
    });
});

// Update payment settings
router.put('/payment-settings', isAdmin, (req, res) => {
    const { upi_id, bank_name, account_number, ifsc_code, account_holder_name, qr_code } = req.body;
    
    // First deactivate all existing settings
    db.query('UPDATE payment_settings SET is_active = 0', (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error updating payment settings' });
        
        // Insert new settings
        const query = 'INSERT INTO payment_settings (upi_id, upi_qr_code, bank_name, account_number, ifsc_code, account_holder_name, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)';
        db.query(query, [upi_id, qr_code || null, bank_name, account_number, ifsc_code, account_holder_name], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving payment settings: ' + err.message });
            }
            res.json({ success: true, message: 'Payment settings updated successfully' });
        });
    });
});

// Delete event
router.delete('/events/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    
    db.query('DELETE FROM registrations WHERE event_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error deleting event registrations' });
        
        db.query('DELETE FROM events WHERE id = ?', [id], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error deleting event' });
            }
            res.json({ success: true, message: 'Event deleted successfully' });
        });
    });
});

// Get all registrations
router.get('/registrations', isAdmin, (req, res) => {
    const { event_id, status } = req.query;
    
    let query = `
        SELECT r.*, e.title as event_title, e.event_date, u.full_name, u.email, u.student_id, u.department 
        FROM registrations r 
        JOIN events e ON r.event_id = e.id 
        JOIN users u ON r.user_id = u.id 
        WHERE 1=1
    `;
    
    const params = [];
    if (event_id) {
        query += ' AND r.event_id = ?';
        params.push(event_id);
    }
    if (status) {
        query += ' AND r.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY r.registration_date DESC';
    
    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching registrations' });
        }
        res.json({ success: true, registrations: results });
    });
});

// Update registration status
router.put('/registrations/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const query = 'UPDATE registrations SET status = ?, notes = ? WHERE id = ?';
    db.query(query, [status, notes || '', id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating registration' });
        }
        res.json({ success: true, message: 'Registration updated successfully' });
    });
});

// Export registrations to Excel (with query parameters)
router.get('/export', isAdmin, async (req, res) => {
    const { eventId, status } = req.query;
    
    let query = `
        SELECT 
            u.full_name as "Student Name",
            u.email as "Email",
            u.student_id as "Student ID",
            u.department as "Department",
            u.phone as "Phone",
            e.title as "Event Name",
            e.event_date as "Event Date",
            e.location as "Location",
            r.team_name as "Team Name",
            r.team_members as "Team Members",
            r.status as "Registration Status",
            r.payment_status as "Payment Status",
            r.payment_amount as "Payment Amount",
            r.registration_date as "Registered Date",
            r.notes as "Notes"
        FROM registrations r 
        JOIN events e ON r.event_id = e.id 
        JOIN users u ON r.user_id = u.id 
        WHERE 1=1
    `;
    
    const params = [];
    if (eventId) {
        query += ' AND r.event_id = ?';
        params.push(eventId);
    }
    if (status) {
        query += ' AND r.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY r.registration_date DESC';
    
    db.query(query, params, async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching data for export' });
        }
        
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Registrations');
            
            // Add headers
            const headers = Object.keys(results[0] || {});
            worksheet.addRow(headers);
            
            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            
            // Add data rows
            results.forEach(row => {
                worksheet.addRow(Object.values(row));
            });
            
            // Auto-fit columns
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, cell => {
                    const length = cell.value ? cell.value.toString().length : 0;
                    if (length > maxLength) maxLength = length;
                });
                column.width = maxLength + 2;
            });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=event_registrations.xlsx');
            
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error creating Excel:', error);
            res.status(500).json({ success: false, message: 'Error creating Excel file' });
        }
    });
});

// Export registrations by event ID
router.get('/export/:eventId', isAdmin, async (req, res) => {
    const { eventId } = req.params;
    
    const query = `
        SELECT 
            u.full_name as "Student Name",
            u.email as "Email",
            u.student_id as "Student ID",
            u.department as "Department",
            u.phone as "Phone",
            e.title as "Event Name",
            e.event_date as "Event Date",
            e.location as "Location",
            r.team_name as "Team Name",
            r.team_members as "Team Members",
            r.status as "Registration Status",
            r.payment_status as "Payment Status",
            r.payment_amount as "Payment Amount",
            r.registration_date as "Registered Date",
            r.notes as "Notes"
        FROM registrations r 
        JOIN events e ON r.event_id = e.id 
        JOIN users u ON r.user_id = u.id 
        WHERE r.event_id = ?
        ORDER BY r.registration_date DESC
    `;
    
    db.query(query, [eventId], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching data for export' });
        }
        
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Registrations');
            
            // Add headers
            const headers = Object.keys(results[0] || {});
            worksheet.addRow(headers);
            
            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            
            // Add data rows
            results.forEach(row => {
                worksheet.addRow(Object.values(row));
            });
            
            // Auto-fit columns
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, cell => {
                    const length = cell.value ? cell.value.toString().length : 0;
                    if (length > maxLength) maxLength = length;
                });
                column.width = maxLength + 2;
            });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=event_registrations.xlsx');
            
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error creating Excel:', error);
            res.status(500).json({ success: false, message: 'Error creating Excel file' });
        }
    });
});

module.exports = router;
