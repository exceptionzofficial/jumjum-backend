// Authentication Routes
const express = require('express');
const router = express.Router();
const UserModel = require('../models/User');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required',
            });
        }

        const result = await UserModel.validateLogin(username, password, role);

        res.json({
            success: true,
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message,
        });
    }
});

// Register new user (admin only in production)
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        if (!username || !password || !name || !role) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: username, password, name, role',
            });
        }

        if (!['bar', 'kitchen', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Must be: bar, kitchen, or admin',
            });
        }

        const user = await UserModel.create({ username, password, name, role });

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
    try {
        const users = await UserModel.getAll();
        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Update user
router.put('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const user = await UserModel.update(userId, updates);
        res.json({
            success: true,
            user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await UserModel.delete(userId);
        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Seed default users (for development)
router.post('/seed', async (req, res) => {
    try {
        await UserModel.seedDefaultUsers();
        res.json({
            success: true,
            message: 'Default users seeded successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
