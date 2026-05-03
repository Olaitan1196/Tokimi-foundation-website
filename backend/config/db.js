// Import mysql2 package
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a connection pool to our database
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

// Test the connection and let us know if it works
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully!');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
};

testConnection();

// Export the pool so other files can use it
export default pool;