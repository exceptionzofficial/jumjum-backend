// Billing Routes
const express = require('express');
const router = express.Router();
const BillingModel = require('../models/Billing');
const MenuItemModel = require('../models/MenuItem');

// GET all bills
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const bills = await BillingModel.getAll(limit);
        res.json({
            success: true,
            count: bills.length,
            data: bills,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET today's bills
router.get('/today', async (req, res) => {
    try {
        const bills = await BillingModel.getToday();
        res.json({
            success: true,
            count: bills.length,
            data: bills,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET revenue stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await BillingModel.getStats();
        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET single bill by ID
router.get('/:billId', async (req, res) => {
    try {
        const bill = await BillingModel.getById(req.params.billId);
        if (!bill) {
            return res.status(404).json({
                success: false,
                error: 'Bill not found',
            });
        }
        res.json({
            success: true,
            data: bill,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST create new bill
router.post('/', async (req, res) => {
    try {
        const { customer, items, paymentMethod } = req.body;

        if (!customer || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide customer and items',
            });
        }

        // Separate bar and kitchen items
        const barItems = items.filter(item => !item.isKitchen);
        const kitchenItems = items.filter(item => item.isKitchen);

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05); // 5% GST
        const total = subtotal + tax;

        // Create bill
        const bill = await BillingModel.create({
            customer,
            items,
            barItems,
            kitchenItems,
            subtotal,
            tax,
            total,
            paymentMethod: paymentMethod || 'cash',
        });

        // Update stock for each item (reduce stock)
        for (const item of items) {
            if (item.itemId) {
                try {
                    await MenuItemModel.updateStock(item.itemId, -item.quantity);
                } catch (stockError) {
                    console.error(`Failed to update stock for ${item.itemId}:`, stockError);
                }
            }
        }

        res.status(201).json({
            success: true,
            data: bill,
            kitchenOrder: kitchenItems.length > 0 ? {
                billId: bill.billId,
                customer: bill.customer,
                items: kitchenItems,
                status: 'pending',
            } : null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// PATCH update bill status
router.patch('/:billId/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Please provide status',
            });
        }

        const bill = await BillingModel.updateStatus(req.params.billId, status);
        res.json({
            success: true,
            data: bill,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
