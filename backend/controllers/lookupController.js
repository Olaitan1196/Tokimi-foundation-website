import pool from '../config/db.js';

// ─────────────────────────────────────────────
// WHITELIST — maps URL slug → actual table name
// This is the ONLY place table names are defined.
// Because we look up the table name from THIS object
// (never directly from req.params), user input can never
// inject an arbitrary table name into our SQL.
// ─────────────────────────────────────────────
const TABLE_MAP = {
    'computer-training-schools': 'computer_training_schools',
    'computer-training-classes': 'computer_training_classes',
    'scholarship-schools':       'scholarship_schools',
    'scholarship-classes':       'scholarship_classes',
    'grant-schools':             'grant_schools',
};

// Small helper — turns the URL slug into a safe table name, or null if invalid
const resolveTable = (slug) => TABLE_MAP[slug] || null;

// ─────────────────────────────────────────────
// 1. ADD A NEW ENTRY (school or class)
// ─────────────────────────────────────────────
export const addEntry = async (req, res) => {
    try {
        const table = resolveTable(req.params.type);
        if (!table) {
            return res.status(400).json({ message: '❌ Invalid lookup type.' });
        }

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: '❌ Name is required.' });
        }

        // If a soft-deleted entry with this name already exists, reactivate it
        // instead of creating a duplicate row
        const existing = await pool.query(
            `SELECT id, is_active FROM ${table} WHERE name = $1`,
            [name.trim()]
        );

        if (existing.rows.length > 0) {
            if (existing.rows[0].is_active) {
                return res.status(400).json({ message: '❌ This entry already exists.' });
            }
            // Reactivate the previously deleted entry
            await pool.query(
                `UPDATE ${table} SET is_active = true WHERE id = $1`,
                [existing.rows[0].id]
            );
            return res.status(200).json({
                message: '✅ Entry reactivated successfully!',
                id: existing.rows[0].id
            });
        }

        const result = await pool.query(
            `INSERT INTO ${table} (name) VALUES ($1) RETURNING id`,
            [name.trim()]
        );

        res.status(201).json({
            message: '✅ Entry added successfully!',
            id: result.rows[0].id
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL ENTRIES (active-only by default)
// ─────────────────────────────────────────────
export const getAllEntries = async (req, res) => {
    try {
        const table = resolveTable(req.params.type);
        if (!table) {
            return res.status(400).json({ message: '❌ Invalid lookup type.' });
        }

        const includeInactive = req.query.includeInactive === 'true';

        const query = includeInactive
            ? `SELECT * FROM ${table} ORDER BY name ASC`
            : `SELECT * FROM ${table} WHERE is_active = true ORDER BY name ASC`;

        const result = await pool.query(query);

        res.status(200).json({
            message: '✅ Entries retrieved successfully!',
            total: result.rows.length,
            entries: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. SOFT-DELETE AN ENTRY
// ─────────────────────────────────────────────
export const deleteEntry = async (req, res) => {
    try {
        const table = resolveTable(req.params.type);
        if (!table) {
            return res.status(400).json({ message: '❌ Invalid lookup type.' });
        }

        const { id } = req.params;

        const result = await pool.query(
            `UPDATE ${table} SET is_active = false WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Entry not found.' });
        }

        res.status(200).json({ message: '✅ Entry removed. It will no longer appear in new registrations.' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. REACTIVATE A SOFT-DELETED ENTRY
// ─────────────────────────────────────────────
export const reactivateEntry = async (req, res) => {
    try {
        const table = resolveTable(req.params.type);
        if (!table) {
            return res.status(400).json({ message: '❌ Invalid lookup type.' });
        }

        const { id } = req.params;

        const result = await pool.query(
            `UPDATE ${table} SET is_active = true WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Entry not found.' });
        }

        res.status(200).json({ message: '✅ Entry reactivated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};