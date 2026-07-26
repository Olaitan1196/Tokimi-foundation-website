import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});

const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Supabase (PostgreSQL) connected successfully!');
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
};

testConnection();

export default pool;