const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Admin Login
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const query = 'SELECT * FROM users WHERE username = ? AND role = "admin"';
    db.query(query, [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = results[0];
        // For demo purposes, accept 'admin123' as password
        // In production, use: const isMatch = await bcrypt.compare(password, user.password_hash);
        const isMatch = (password === 'admin123');
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        req.session.user = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
        res.json({ success: true, message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
    });
});

// Student Login
router.post('/student/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const query = 'SELECT * FROM users WHERE email = ? AND role = "student"';
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = results[0];
        // Use bcrypt compare for password verification
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        req.session.user = { id: user.id, email: user.email, role: user.role, full_name: user.full_name, student_id: user.student_id };
        res.json({ success: true, message: 'Login successful', user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } });
    });
});

// Student Registration
router.post('/student/register', async (req, res) => {
    const { fullName, email, studentId, department, phone, password } = req.body;
    
    if (!fullName || !email || !studentId || !password) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check if email or student_id already exists
    const checkQuery = 'SELECT id FROM users WHERE email = ? OR student_id = ?';
    db.query(checkQuery, [email, studentId], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email or Student ID already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertQuery = 'INSERT INTO users (username, email, password_hash, role, full_name, student_id, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(insertQuery, [email, email, passwordHash, 'student', fullName, studentId, department || '', phone || ''], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error registering user' });
            }
            res.json({ success: true, message: 'Registration successful! Please login.' });
        });
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Check session
router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'No active session' });
    }
});

// Get payment settings (public - for students to view payment details)
router.get('/payment-settings', (req, res) => {
    const query = 'SELECT * FROM payment_settings WHERE is_active = 1 LIMIT 1';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching payment settings' });
        }
        res.json({ success: true, paymentSettings: results[0] || null });
    });
});

module.exports = router;
