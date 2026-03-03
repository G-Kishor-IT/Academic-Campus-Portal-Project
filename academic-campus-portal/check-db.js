const db = require('./src/config/db');

db.query('DESCRIBE payment_settings', (err, results) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log('Table structure:');
        results.forEach(row => {
            console.log(row.Field + ' - ' + row.Type);
        });
        
        // Check if qr_code column exists
        const hasQrCode = results.some(row => row.Field === 'qr_code');
        if (!hasQrCode) {
            console.log('\nAdding qr_code column...');
            db.query('ALTER TABLE payment_settings ADD COLUMN qr_code TEXT', (err2) => {
                if (err2) {
                    console.error('Error adding column:', err2.message);
                } else {
                    console.log('qr_code column added successfully!');
                }
                process.exit();
            });
        } else {
            console.log('\nqr_code column already exists!');
            process.exit();
        }
    }
});
