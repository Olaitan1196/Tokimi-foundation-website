// backend/controllers/grantController.js  (new file — grants are now separate from scholarships)
import pool from '../config/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// 1. ADD A GRANT
// ─────────────────────────────────────────────
export const addGrant = async (req, res) => {
    try {
        const {
            beneficiary_name, beneficiary_status,
            school_id, business_type,
            purpose, amount, date_awarded
        } = req.body;

        if (!beneficiary_name || !beneficiary_status || !purpose || !amount || !date_awarded) {
            return res.status(400).json({
                message: '❌ Beneficiary name, status, purpose, amount and date awarded are required.'
            });
        }

        if (beneficiary_status === 'student' && !school_id) {
            return res.status(400).json({ message: '❌ School is required for a student beneficiary.' });
        }

        if (beneficiary_status === 'business_owner' && !business_type) {
            return res.status(400).json({ message: '❌ Business type is required for a business owner beneficiary.' });
        }

        const result = await pool.query(
            `INSERT INTO grants
            (beneficiary_name, beneficiary_status, school_id, business_type, purpose, amount, date_awarded)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [
                beneficiary_name, beneficiary_status,
                beneficiary_status === 'student' ? school_id : null,
                beneficiary_status === 'business_owner' ? business_type : null,
                purpose, amount, date_awarded
            ]
        );

        res.status(201).json({
            message: `✅ Grant awarded successfully to ${beneficiary_name}!`,
            grantId: result.rows[0].id
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL GRANTS
// ─────────────────────────────────────────────
export const getGrants = async (req, res) => {
    try {
        const { beneficiary_status } = req.query;

        let query = `
            SELECT g.*, sc.name AS school_name
            FROM grants g
            LEFT JOIN grant_schools sc ON g.school_id = sc.id
        `;
        const params = [];

        if (beneficiary_status) {
            query += ' WHERE g.beneficiary_status = $1';
            params.push(beneficiary_status);
        }

        query += ' ORDER BY g.date_awarded DESC';

        const result = await pool.query(query, params);

        const totalAmount = result.rows.reduce(
            (sum, item) => sum + parseFloat(item.amount), 0
        );

        res.status(200).json({
            message: '✅ Grants retrieved successfully!',
            total: result.rows.length,
            totalAmount: totalAmount.toFixed(2),
            grants: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE GRANT BY ID
// ─────────────────────────────────────────────
export const getGrantById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT g.*, sc.name AS school_name
            FROM grants g
            LEFT JOIN grant_schools sc ON g.school_id = sc.id
            WHERE g.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Grant record not found.' });
        }

        res.status(200).json({
            message: '✅ Grant found!',
            grant: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A GRANT
// ─────────────────────────────────────────────
export const updateGrant = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            beneficiary_name, beneficiary_status,
            school_id, business_type,
            purpose, amount, date_awarded
        } = req.body;

        const result = await pool.query(
            `UPDATE grants SET
                beneficiary_name = $1,
                beneficiary_status = $2,
                school_id = $3,
                business_type = $4,
                purpose = $5,
                amount = $6,
                date_awarded = $7
            WHERE id = $8`,
            [
                beneficiary_name, beneficiary_status,
                beneficiary_status === 'student' ? school_id : null,
                beneficiary_status === 'business_owner' ? business_type : null,
                purpose, amount, date_awarded,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Grant record not found.' });
        }

        res.status(200).json({ message: '✅ Grant updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A GRANT
// ─────────────────────────────────────────────
export const deleteGrant = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM grants WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Grant record not found.' });
        }

        res.status(200).json({ message: '✅ Grant deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. EXPORT GRANTS TO CSV
// ─────────────────────────────────────────────
export const exportGrants = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                g.id, g.beneficiary_name, g.beneficiary_status,
                sc.name AS school, g.business_type,
                g.purpose, g.amount, g.date_awarded
            FROM grants g
            LEFT JOIN grant_schools sc ON g.school_id = sc.id
            ORDER BY g.date_awarded DESC`
        );

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'grants.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',                title: 'ID' },
                { id: 'beneficiary_name',  title: 'Beneficiary Name' },
                { id: 'beneficiary_status',title: 'Status' },
                { id: 'school',            title: 'School' },
                { id: 'business_type',     title: 'Business Type' },
                { id: 'purpose',           title: 'Purpose' },
                { id: 'amount',            title: 'Amount' },
                { id: 'date_awarded',      title: 'Date Awarded' },
            ]
        });

        await csvWriter.writeRecords(result.rows);

        res.download(filePath, 'tokimi_grants.csv');

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};