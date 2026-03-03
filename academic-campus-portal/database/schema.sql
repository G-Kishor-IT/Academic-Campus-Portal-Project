-- Database Creation
CREATE DATABASE IF NOT EXISTS campus_event_portal;
USE campus_event_portal;

-- Users Table (Admins and Students)
CREATE TABLE IF NOT EXISTS users (
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
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
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
);

-- Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    team_name VARCHAR(100),
    team_members TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
    payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(100),
    payment_date TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payment Settings Table
CREATE TABLE IF NOT EXISTS payment_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    upi_id VARCHAR(100),
    bank_name VARCHAR(200),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    account_holder_name VARCHAR(150),
    qr_code TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin Credentials (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name, department) VALUES
('admin', 'admin@campus.edu', '$2b$10$YourSecureHashHere', 'admin', 'System Administrator', 'Administration');

-- Sample Events
INSERT INTO events (title, description, event_type, location, event_date, event_time, registration_deadline, max_participants, is_team_event, max_team_size, fee_per_person, status, created_by) VALUES
('Tech Symposium 2024', 'Annual technology symposium featuring student projects and industry experts', 'Academic', 'Main Auditorium', '2024-12-15', '09:00:00', '2024-12-10', 200, 1, 4, 100, 'active', 1),
('Sports Day', 'Inter-department sports competition', 'Sports', 'Sports Ground', '2024-11-20', '08:00:00', '2024-11-15', 500, 1, 6, 50, 'active', 1),
('Cultural Fest', 'Annual cultural festival with dance, music and drama', 'Cultural', 'Open Air Theater', '2024-12-01', '10:00:00', '2024-11-25', 300, 1, 5, 75, 'active', 1),
('Hackathon 2024', '24-hour coding competition', 'Technical', 'Computer Lab Block A', '2024-11-30', '18:00:00', '2024-11-28', 50, 1, 4, 200, 'active', 1),
('Workshop: Web Development', 'Hands-on workshop on modern web technologies', 'Workshop', 'Lab 101', '2024-11-25', '14:00:00', '2024-11-24', 30, 0, 1, 0, 'active', 1);
