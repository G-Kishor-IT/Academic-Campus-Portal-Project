const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    // First connect without database to create it
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'kishor15'
    });

    console.log('Connected to MySQL server');

    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS campus_event_portal');
    await connection.query('USE campus_event_portal');
    
    console.log('Database created/selected');

    // Drop existing tables (in reverse order due to foreign keys)
    await connection.query('DROP TABLE IF EXISTS registrations').catch(() => {});
    await connection.query('DROP TABLE IF EXISTS events').catch(() => {});
    await connection.query('DROP TABLE IF EXISTS users').catch(() => {});
    
    console.log('Existing tables dropped');

    // Create users table
    await connection.query(`
        CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'student') NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            department VARCHAR(100),
            student_id VARCHAR(50),
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    console.log('Users table created');

    // Create events table
    await connection.query(`
        CREATE TABLE events (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            event_type VARCHAR(100),
            location VARCHAR(200),
            event_date DATE NOT NULL,
            event_time TIME NOT NULL,
            registration_deadline DATE,
            max_participants INT,
            is_team_event TINYINT(1) DEFAULT 0,
            max_team_size INT DEFAULT 1,
            fee_per_person DECIMAL(10,2) DEFAULT 0,
            status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);
    console.log('Events table created');

    // Create payment_settings table
    await connection.query(`
        CREATE TABLE payment_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            event_id INT,
            upi_id VARCHAR(100),
            upi_qr_code TEXT,
            bank_name VARCHAR(100),
            account_number VARCHAR(50),
            ifsc_code VARCHAR(50),
            account_holder_name VARCHAR(100),
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    `);
    console.log('Payment settings table created');

    // Create registrations table
    await connection.query(`
        CREATE TABLE registrations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            team_name VARCHAR(100),
            team_members TEXT,
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            notes TEXT,
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    console.log('Registrations table created');

    // Insert admin user with hashed password
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
        'INSERT INTO users (username, email, password_hash, role, full_name, department) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@campus.edu', adminPassword, 'admin', 'System Administrator', 'Administration']
    );
    console.log('Admin user created');

    // Insert sample events (10 events) with fee_per_person = 100
    const events = [
        ['Tech Symposium 2024', 'Annual technology symposium featuring student projects and industry experts', 'Academic', 'Main Auditorium', '2024-12-15', '09:00:00', '2024-12-10', 200, 1, 4, 100, 'active'],
        ['Sports Day', 'Inter-department sports competition', 'Sports', 'Sports Ground', '2024-11-20', '08:00:00', '2024-11-15', 500, 1, 6, 100, 'active'],
        ['Cultural Fest', 'Annual cultural festival with dance, music and drama', 'Cultural', 'Open Air Theater', '2024-12-01', '10:00:00', '2024-11-25', 300, 1, 5, 100, 'active'],
        ['Hackathon 2024', '24-hour coding competition', 'Technical', 'Computer Lab Block A', '2024-11-30', '18:00:00', '2024-11-28', 50, 1, 4, 100, 'active'],
        ['Workshop: Web Development', 'Hands-on workshop on modern web technologies', 'Workshop', 'Lab 101', '2024-11-25', '14:00:00', '2024-11-24', 30, 0, 1, 100, 'active'],
        ['Science Fair', 'Showcase of student science projects and experiments', 'Academic', 'Science Block', '2024-12-10', '10:00:00', '2024-12-05', 150, 1, 3, 100, 'active'],
        ['Music Competition', 'Solo and group music performance competition', 'Cultural', 'Music Hall', '2024-12-20', '13:00:00', '2024-12-15', 100, 1, 5, 100, 'active'],
        ['Robotics Workshop', 'Build and program robots with expert guidance', 'Technical', 'Robotics Lab', '2024-11-28', '09:00:00', '2024-11-25', 40, 1, 2, 100, 'active'],
        ['Debate Competition', 'Inter-college debate contest on current topics', 'Academic', 'Conference Room A', '2024-12-05', '15:00:00', '2024-12-01', 80, 0, 1, 100, 'active'],
        ['Art Exhibition', 'Display of student artwork and paintings', 'Cultural', 'Art Gallery', '2024-12-18', '11:00:00', '2024-12-12', 200, 0, 1, 100, 'active']
    ];

    for (const event of events) {
        await connection.query(
            'INSERT INTO events (title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
            event
        );
    }
    console.log('Sample events created with fee_per_person = 100');

    // Insert default payment settings
    await connection.query(`
        INSERT INTO payment_settings (event_id, upi_id, upi_qr_code, bank_name, account_number, ifsc_code, account_holder_name, is_active) VALUES 
        (NULL, 'campus@upi', '', 'State Bank of India', '1234567890', 'SBIN0001234', 'Campus Event Portal', 1)
    `);
    console.log('Default payment settings created');

    console.log('\n=== Database setup complete! ===');
    console.log('Admin Login:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
    await connection.end();
}

setupDatabase().catch(console.error);
