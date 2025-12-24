// Menu Items Routes
const express = require('express');
const router = express.Router();
const MenuItemModel = require('../models/MenuItem');

// GET all menu items
router.get('/', async (req, res) => {
    try {
        const items = await MenuItemModel.getAll();
        res.json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET bar items only
router.get('/bar', async (req, res) => {
    try {
        const items = await MenuItemModel.getByType(false);
        res.json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET kitchen items only
router.get('/kitchen', async (req, res) => {
    try {
        const items = await MenuItemModel.getByType(true);
        res.json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET low stock items
router.get('/low-stock', async (req, res) => {
    try {
        const items = await MenuItemModel.getLowStock();
        res.json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET single menu item by ID
router.get('/:itemId', async (req, res) => {
    try {
        const item = await MenuItemModel.getById(req.params.itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found',
            });
        }
        res.json({
            success: true,
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST create new menu item
router.post('/', async (req, res) => {
    try {
        const { itemId, name, price, category, stock, lowStockThreshold, isKitchen } = req.body;

        if (!itemId || !name || !price || !category) {
            return res.status(400).json({
                success: false,
                error: 'Please provide itemId, name, price, and category',
            });
        }

        const item = await MenuItemModel.create({
            itemId,
            name,
            price,
            category,
            stock: stock || 0,
            lowStockThreshold: lowStockThreshold || 10,
            isKitchen: isKitchen || false,
        });

        res.status(201).json({
            success: true,
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// PUT update menu item
router.put('/:itemId', async (req, res) => {
    try {
        const item = await MenuItemModel.update(req.params.itemId, req.body);
        res.json({
            success: true,
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// PATCH update stock
router.patch('/:itemId/stock', async (req, res) => {
    try {
        const { quantity } = req.body;

        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Please provide quantity',
            });
        }

        const item = await MenuItemModel.updateStock(req.params.itemId, quantity);
        res.json({
            success: true,
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// DELETE menu item
router.delete('/:itemId', async (req, res) => {
    try {
        const item = await MenuItemModel.delete(req.params.itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found',
            });
        }
        res.json({
            success: true,
            data: item,
            message: 'Item deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
