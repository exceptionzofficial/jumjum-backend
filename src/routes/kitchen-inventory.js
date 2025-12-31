// Kitchen Inventory Routes
const express = require('express');
const router = express.Router();
const KitchenInventoryModel = require('../models/KitchenInventory');

// GET all inventory items
router.get('/', async (req, res) => {
    try {
        const items = await KitchenInventoryModel.getAll();
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
        const items = await KitchenInventoryModel.getLowStock();
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

// GET single inventory item
router.get('/:inventoryId', async (req, res) => {
    try {
        const item = await KitchenInventoryModel.getById(req.params.inventoryId);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Inventory item not found',
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

// POST create new inventory item
router.post('/', async (req, res) => {
    try {
        const { name, quantity, unit, minStock, category } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Please provide item name',
            });
        }

        // Determine status based on quantity and minStock
        let status = 'available';
        if (quantity === 0) {
            status = 'out';
        } else if (quantity <= (minStock || 10)) {
            status = 'low';
        }

        const item = await KitchenInventoryModel.create({
            name,
            quantity: quantity || 0,
            unit: unit || 'pcs',
            minStock: minStock || 10,
            category: category || 'general',
            status,
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

// PUT update inventory item
router.put('/:inventoryId', async (req, res) => {
    try {
        const { name, quantity, unit, minStock, category } = req.body;

        // Determine status based on quantity and minStock
        let status = 'available';
        if (quantity === 0) {
            status = 'out';
        } else if (quantity <= (minStock || 10)) {
            status = 'low';
        }

        const item = await KitchenInventoryModel.update(req.params.inventoryId, {
            name,
            quantity,
            unit,
            minStock,
            category,
            status,
        });

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

// PATCH update status (low/out/available)
router.patch('/:inventoryId/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['available', 'low', 'out'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide valid status (available, low, out)',
            });
        }

        const item = await KitchenInventoryModel.updateStatus(req.params.inventoryId, status);
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

// PATCH refill stock
router.patch('/:inventoryId/refill', async (req, res) => {
    try {
        const { quantity } = req.body;

        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide valid quantity',
            });
        }

        const item = await KitchenInventoryModel.refill(req.params.inventoryId, quantity);
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

// DELETE inventory item
router.delete('/:inventoryId', async (req, res) => {
    try {
        await KitchenInventoryModel.delete(req.params.inventoryId);
        res.json({
            success: true,
            message: 'Inventory item deleted',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
