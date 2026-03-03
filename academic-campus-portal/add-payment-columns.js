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
    
    // Add payment_status column
    db.query(`ALTER TABLE registrations ADD COLUMN payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid'`, (err, result) => {
        if (err) console.log('payment_status:', err.message);
        else console.log('payment_status column added');
        
        // Add payment_amount column
        db.query(`ALTER TABLE registrations ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0`, (err, result) => {
            if (err) console.log('payment_amount:', err.message);
            else console.log('payment_amount column added');
            
            // Add payment_method column
            db.query(`ALTER TABLE registrations ADD COLUMN payment_method VARCHAR(50)`, (err, result) => {
                if (err) console.log('payment_method:', err.message);
                else console.log('payment_method column added');
                
                // Add payment_transaction_id column
                db.query(`ALTER TABLE registrations ADD COLUMN payment_transaction_id VARCHAR(100)`, (err, result) => {
                    if (err) console.log('payment_transaction_id:', err.message);
                    else console.log('payment_transaction_id column added');
                    
                    // Add payment_date column
                    db.query(`ALTER TABLE registrations ADD COLUMN payment_date TIMESTAMP NULL`, (err, result) => {
                        if (err) console.log('payment_date:', err.message);
                        else console.log('payment_date column added');
                        
                        console.log('All payment columns added successfully!');
                        db.end();
                    });
                });
            });
        });
    });
});
