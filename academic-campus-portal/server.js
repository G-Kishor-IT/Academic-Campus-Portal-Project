const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const studentRoutes = require('./src/routes/studentRoutes');

const app = express();
const PORT = 3002;

// Middleware
// Allow credentialed requests (cookies) from the same origin / configured origins
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: 'campus-portal-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// View engine
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'admin-dashboard.html'));
});

app.get('/admin/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'manage-events.html'));
});

app.get('/admin/registrations', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'view-registrations.html'));
});

app.get('/admin/payment-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'payment-settings.html'));
});

app.get('/student/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student', 'student-register.html'));
});

app.get('/student/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student', 'student-login.html'));
});

app.get('/student/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student', 'student-dashboard.html'));
});

app.get('/student/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student', 'event-list.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Academic Campus Event Portal running on http://localhost:${PORT}`);
    console.log(`Admin Login: http://localhost:${PORT}/admin/login`);
    console.log(`Student Login: http://localhost:${PORT}/student/login`);
});
