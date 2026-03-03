const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'kishor15',
    database: 'campus_event_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Add payment columns to registrations table
    const alterTableQuery = `
        ALTER TABLE registrations 
        ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
        ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP NULL
    `;
    
    db.query(alterTableQuery, (err, result) => {
        if (err) {
            console.log('Table might already have columns or error:', err.message);
        } else {
            console.log('Payment columns added successfully');
        }
        
        // Insert default payment settings if not exists
        const checkPaymentSettings = 'SELECT id FROM payment_settings LIMIT 1';
        db.query(checkPaymentSettings, (err, results) => {
            if (results.length === 0) {
                const insertPaymentSettings = `
                    INSERT INTO payment_settings (upi_id, bank_name, account_number, ifsc_code, account_holder_name, is_active) 
                    VALUES ('', '', '', '', '', 1)
                `;
                db.query(insertPaymentSettings, (err, result) => {
                    if (err) {
                        console.log('Error inserting payment settings:', err.message);
                    } else {
                        console.log('Default payment settings created');
                    }
                    db.end();
                });
            } else {
                console.log('Payment settings already exist');
                db.end();
            }
        });
    });
});
