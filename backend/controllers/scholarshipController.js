// backend/controllers/scholarshipController.js
import pool from '../config/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// 1. ADD A SCHOLARSHIP
// ─────────────────────────────────────────────
export const addScholarship = async (req, res) => {
    try {
        const { student_name, school_id, class_id, purpose, amount, date_awarded } = req.body;

        if (!student_name || !school_id || !class_id || !purpose || !amount || !date_awarded) {
            return res.status(400).json({
                message: '❌ Student name, school, class, purpose, amount and date awarded are required.'
            });
        }

        const result = await pool.query(
            `INSERT INTO scholarships
            (student_name, school_id, class_id, purpose, amount, date_awarded)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [student_name, school_id, class_id, purpose, amount, date_awarded]
        );

        res.status(201).json({
            message: `✅ Scholarship awarded successfully to ${student_name}!`,
            scholarshipId: result.rows[0].id
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL SCHOLARSHIPS
// ─────────────────────────────────────────────
export const getScholarships = async (req, res) => {
    try {
        const { purpose } = req.query;

        let query = `
            SELECT
                s.*,
                sc.name AS school_name,
                cl.name AS class_name
            FROM scholarships s
            LEFT JOIN scholarship_schools sc ON s.school_id = sc.id
            LEFT JOIN scholarship_classes cl ON s.class_id = cl.id
        `;
        const params = [];

        if (purpose) {
            query += ' WHERE s.purpose = $1';
            params.push(purpose);
        }

        query += ' ORDER BY s.date_awarded DESC';

        const result = await pool.query(query, params);

        const totalAmount = result.rows.reduce(
            (sum, item) => sum + parseFloat(item.amount), 0
        );

        res.status(200).json({
            message: '✅ Scholarships retrieved successfully!',
            total: result.rows.length,
            totalAmount: totalAmount.toFixed(2),
            scholarships: result.rows
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

        const result = await pool.query(
            `SELECT
                s.*,
                sc.name AS school_name,
                cl.name AS class_name
            FROM scholarships s
            LEFT JOIN scholarship_schools sc ON s.school_id = sc.id
            LEFT JOIN scholarship_classes cl ON s.class_id = cl.id
            WHERE s.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({
            message: '✅ Scholarship found!',
            scholarship: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A SCHOLARSHIP
// ─────────────────────────────────────────────
export const updateScholarship = async (req, res) => {
    try {
        const { id } = req.params;
        const { student_name, school_id, class_id, purpose, amount, date_awarded } = req.body;

        const result = await pool.query(
            `UPDATE scholarships SET
                student_name = $1,
                school_id = $2,
                class_id = $3,
                purpose = $4,
                amount = $5,
                date_awarded = $6
            WHERE id = $7`,
            [student_name, school_id, class_id, purpose, amount, date_awarded, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({ message: '✅ Scholarship updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A SCHOLARSHIP
// ─────────────────────────────────────────────
export const deleteScholarship = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM scholarships WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Scholarship record not found.' });
        }

        res.status(200).json({ message: '✅ Scholarship deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. EXPORT SCHOLARSHIPS TO CSV
// ─────────────────────────────────────────────
export const exportScholarships = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                s.id, s.student_name,
                sc.name AS school, cl.name AS class,
                s.purpose, s.amount, s.date_awarded
            FROM scholarships s
            LEFT JOIN scholarship_schools sc ON s.school_id = sc.id
            LEFT JOIN scholarship_classes cl ON s.class_id = cl.id
            ORDER BY s.date_awarded DESC`
        );

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'scholarships.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',           title: 'ID' },
                { id: 'student_name', title: 'Student Name' },
                { id: 'school',       title: 'School' },
                { id: 'class',        title: 'Class' },
                { id: 'purpose',      title: 'Purpose' },
                { id: 'amount',       title: 'Amount' },
                { id: 'date_awarded', title: 'Date Awarded' },
            ]
        });

        await csvWriter.writeRecords(result.rows);

        res.download(filePath, 'tokimi_scholarships.csv');

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};