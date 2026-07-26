import pool from '../config/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// MULTER SETUP — for staff photo uploads
// (No changes here — Multer has nothing to do with the database)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/staff');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `staff_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('❌ Only JPEG, PNG and WEBP images are allowed'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ─────────────────────────────────────────────
// 1. ADD A STAFF MEMBER
// ─────────────────────────────────────────────
export const addStaff = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, role, department } = req.body;

        if (!first_name || !last_name || !role) {
            return res.status(400).json({
                message: '❌ First name, last name and role are required.'
            });
        }

        if (email) {
            const existing = await pool.query(
                'SELECT id FROM staff WHERE email = $1',
                [email]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    message: '❌ A staff member with this email already exists.'
                });
            }
        }

        const photo_url = req.file
            ? `/uploads/staff/${req.file.filename}`
            : null;

        const result = await pool.query(
            `INSERT INTO staff
            (first_name, last_name, email, phone, role, department, photo_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [first_name, last_name, email, phone, role, department, photo_url]
        );

        res.status(201).json({
            message: `✅ Staff member ${first_name} ${last_name} added successfully!`,
            staffId: result.rows[0].id,
            photo_url
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL STAFF MEMBERS
// ─────────────────────────────────────────────
export const getAllStaff = async (req, res) => {
    try {
        const { department } = req.query;

        let query = 'SELECT * FROM staff';
        let params = [];

        if (department) {
            query += ' WHERE department = $1';
            params = [department];
        }

        query += ' ORDER BY department ASC, last_name ASC';

        const result = await pool.query(query, params);

        res.status(200).json({
            message: '✅ Staff members retrieved successfully!',
            total: result.rows.length,
            staff: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE STAFF MEMBER
// ─────────────────────────────────────────────
export const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM staff WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        res.status(200).json({
            message: '✅ Staff member found!',
            staff: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A STAFF MEMBER
// ─────────────────────────────────────────────
export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, role, department } = req.body;

        const existing = await pool.query(
            'SELECT * FROM staff WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        const photo_url = req.file
            ? `/uploads/staff/${req.file.filename}`
            : existing.rows[0].photo_url;

        if (req.file && existing.rows[0].photo_url) {
            const oldPhotoPath = path.join(__dirname, '..', existing.rows[0].photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        await pool.query(
            `UPDATE staff SET
                first_name = $1,
                last_name  = $2,
                email      = $3,
                phone      = $4,
                role       = $5,
                department = $6,
                photo_url  = $7
            WHERE id = $8`,
            [first_name, last_name, email, phone, role, department, photo_url, id]
        );

        res.status(200).json({ message: '✅ Staff member updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A STAFF MEMBER
// ─────────────────────────────────────────────
export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await pool.query(
            'SELECT * FROM staff WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        if (existing.rows[0].photo_url) {
            const photoPath = path.join(__dirname, '..', existing.rows[0].photo_url);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }

        await pool.query('DELETE FROM staff WHERE id = $1', [id]);

        res.status(200).json({ message: '✅ Staff member deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. EXPORT STAFF TO CSV
// ─────────────────────────────────────────────
export const exportStaff = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM staff ORDER BY department ASC, last_name ASC'
        );

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'staff.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',         title: 'ID' },
                { id: 'first_name', title: 'First Name' },
                { id: 'last_name',  title: 'Last Name' },
                { id: 'email',      title: 'Email' },
                { id: 'phone',      title: 'Phone' },
                { id: 'role',       title: 'Role' },
                { id: 'department', title: 'Department' },
                { id: 'created_at', title: 'Date Added' },
            ]
        });

        await csvWriter.writeRecords(result.rows);

        res.download(filePath, 'tokimi_staff.csv');

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};