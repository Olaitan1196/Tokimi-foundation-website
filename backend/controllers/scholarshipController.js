import pool from '../config/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// 1. ADD A SCHOLARSHIP OR GRANT
// ─────────────────────────────────────────────
export const addScholarship = async (req, res) => {
    try {
        const { student_id, type, amount, description, date_awarded } = req.body;

        // Validate required fields
        if (!student_id || !type || !amount || !date_awarded) {
            return res.status(400).json({
                message: '❌ Student ID, type, amount and date awarded are required.'
            });
        }

        // Check if the student actually exists
        const [student] = await pool.query(
            'SELECT id, first_name, last_name FROM students WHERE id = ?',
            [student_id]
        );

        if (student.length === 0) {
            return res.status(404).json({
                message: '❌ Student not found. Please enroll the student first.'
            });
        }

        // Insert the scholarship record
        const [result] = await pool.query(
            `INSERT INTO scholarships 
            (student_id, type, amount, description, date_awarded)
            VALUES (?, ?, ?, ?, ?)`,
            [student_id, type, amount, description, date_awarded]
        );

        res.status(201).json({
            message: `✅ ${type} awarded successfully to ${student[0].first_name} ${student[0].last_name}!`,
            scholarshipId: result.insertId
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL SCHOLARSHIPS (with student details)
// ─────────────────────────────────────────────
export const getScholarships = async (req, res) => {
    try {
        const { type } = req.query;

        let query = `
            SELECT 
                s.id,
                s.type,
                s.amount,
                s.description,
                s.date_awarded,
                s.created_at,
                st.id AS student_id,
                st.first_name,
                st.last_name,
                st.email,
                st.batch,
                st.year
            FROM scholarships s
            JOIN students st ON s.student_id = st.id
        `;

        let params = [];

        if (type) {
            query += ' WHERE s.type = ?';
            params = [type];
        }

        query += ' ORDER BY s.date_awarded DESC';

        const [scholarships] = await pool.query(query, params);

        // Calculate total amount awarded
        const totalAmount = scholarships.reduce(
            (sum, item) => sum + parseFloat(item.amount), 0
        );

        res.status(200).json({
            message: '✅ Scholarships retrieved successfully!',
            total: scholarships.length,
            totalAmount: totalAmount.toFixed(2),
            scholarships
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE SCHOLARSHIP BY ID
// ─────────────────────────────────────────────
export const getScholarshipById = async (req, res) => {
    try {
        const { id } = req.params;

        const [scholarship] = await pool.query(
            `SELECT 
                s.*,
                st.first_name,
                st.last_name,
                st.email,
                st.batch,
                st.year
            FROM scholarships s
            JOIN students st ON s.student_id = st.id
            WHERE s.id = ?`,
            [id]
        );

        if (scholarship.length === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({
            message: '✅ Scholarship found!',
            scholarship: scholarship[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. GET SCHOLARSHIPS BY STUDENT ID
// ─────────────────────────────────────────────
export const getScholarshipsByStudent = async (req, res) => {
    try {
        const { student_id } = req.params;

        const [scholarships] = await pool.query(
            `SELECT 
                s.*,
                st.first_name,
                st.last_name,
                st.batch,
                st.year
            FROM scholarships s
            JOIN students st ON s.student_id = st.id
            WHERE s.student_id = ?
            ORDER BY s.date_awarded DESC`,
            [student_id]
        );

        const totalAmount = scholarships.reduce(
            (sum, item) => sum + parseFloat(item.amount), 0
        );

        res.status(200).json({
            message: '✅ Student scholarships retrieved!',
            total: scholarships.length,
            totalAmount: totalAmount.toFixed(2),
            scholarships
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. UPDATE A SCHOLARSHIP
// ─────────────────────────────────────────────
export const updateScholarship = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, amount, description, date_awarded } = req.body;

        const [result] = await pool.query(
            `UPDATE scholarships SET
                type = ?,
                amount = ?,
                description = ?,
                date_awarded = ?
            WHERE id = ?`,
            [type, amount, description, date_awarded, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({ message: '✅ Scholarship updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. DELETE A SCHOLARSHIP
// ─────────────────────────────────────────────
export const deleteScholarship = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM scholarships WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({ message: '✅ Scholarship deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 7. EXPORT SCHOLARSHIPS TO CSV
// ─────────────────────────────────────────────
export const exportScholarships = async (req, res) => {
    try {
        const [scholarships] = await pool.query(
            `SELECT 
                s.id,
                st.first_name,
                st.last_name,
                st.batch,
                st.year,
                s.type,
                s.amount,
                s.description,
                s.date_awarded
            FROM scholarships s
            JOIN students st ON s.student_id = st.id
            ORDER BY s.date_awarded DESC`
        );

        // Make sure exports folder exists
        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'scholarships.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',           title: 'ID' },
                { id: 'first_name',   title: 'First Name' },
                { id: 'last_name',    title: 'Last Name' },
                { id: 'batch',        title: 'Batch' },
                { id: 'year',         title: 'Year' },
                { id: 'type',         title: 'Type' },
                { id: 'amount',       title: 'Amount' },
                { id: 'description',  title: 'Description' },
                { id: 'date_awarded', title: 'Date Awarded' },
            ]
        });

        await csvWriter.writeRecords(scholarships);

        res.download(filePath, 'tokimi_scholarships.csv');

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};