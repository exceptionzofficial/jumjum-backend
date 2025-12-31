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

// GET pending/open bills
router.get('/pending', async (req, res) => {
    try {
        const bills = await BillingModel.getPending();
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

// GET check existing bill by phone for today
router.get('/find-by-phone/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        const bill = await BillingModel.findTodayByPhone(phone);
        res.json({
            success: true,
            exists: !!bill,
            data: bill,
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

// POST create new bill (or add to existing if phone exists today)
router.post('/', async (req, res) => {
    try {
        const { customer, items, paymentMethod, status } = req.body;

        if (!customer || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide customer and items',
            });
        }

        const phone = customer.phone?.trim();
        let existingBill = null;

        // Check if there's an existing bill today for this phone
        if (phone) {
            existingBill = await BillingModel.findTodayByPhone(phone);
        }

        // Separate bar and kitchen items
        const barItems = items.filter(item => !item.isKitchen);
        const kitchenItems = items.filter(item => item.isKitchen);

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;

        let bill;
        let isUpdate = false;

        if (existingBill) {
            // Add items to existing bill
            isUpdate = true;
            const existingItems = existingBill.items || [];

            // Merge items (combine quantities for same itemId)
            const mergedItems = [...existingItems];
            for (const newItem of items) {
                const existingIdx = mergedItems.findIndex(i => i.itemId === newItem.itemId);
                if (existingIdx >= 0) {
                    mergedItems[existingIdx].quantity += newItem.quantity;
                } else {
                    mergedItems.push(newItem);
                }
            }

            // Recalculate totals
            const newSubtotal = mergedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTax = Math.round(newSubtotal * 0.05);
            const newTotal = newSubtotal + newTax;

            // Update existing bill
            bill = await BillingModel.update(existingBill.billid, {
                customer: { ...existingBill.customer, ...customer },
                items: mergedItems,
                barItems: mergedItems.filter(i => !i.isKitchen),
                kitchenItems: mergedItems.filter(i => i.isKitchen),
                subtotal: newSubtotal,
                tax: newTax,
                total: newTotal,
                status: status || 'open',
            });

            // Update stock for new items only
            for (const item of items) {
                if (item.itemId) {
                    try {
                        await MenuItemModel.updateStock(item.itemId, -item.quantity);
                    } catch (stockError) {
                        console.error(`Failed to update stock for ${item.itemId}:`, stockError);
                    }
                }
            }
        } else {
            // Create new bill
            bill = await BillingModel.create({
                customer,
                items,
                barItems,
                kitchenItems,
                subtotal,
                tax,
                total,
                paymentMethod: paymentMethod || 'cash',
                status: status || 'open',
            });

            // Update stock
            for (const item of items) {
                if (item.itemId) {
                    try {
                        await MenuItemModel.updateStock(item.itemId, -item.quantity);
                    } catch (stockError) {
                        console.error(`Failed to update stock for ${item.itemId}:`, stockError);
                    }
                }
            }
        }

        res.status(isUpdate ? 200 : 201).json({
            success: true,
            isUpdate,
            data: bill,
            kitchenOrder: kitchenItems.length > 0 ? {
                billId: bill.billId || bill.billid,
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

// PUT update existing bill
router.put('/:billId', async (req, res) => {
    try {
        const { customer, items, status } = req.body;
        const billId = req.params.billId;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide items',
            });
        }

        const existingBill = await BillingModel.getById(billId);
        if (!existingBill) {
            return res.status(404).json({
                success: false,
                error: 'Bill not found',
            });
        }

        const barItems = items.filter(item => !item.isKitchen);
        const kitchenItems = items.filter(item => item.isKitchen);

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;

        // Calculate stock changes
        const existingItemsMap = new Map(
            (existingBill.items || []).map(item => [item.itemId, item.quantity])
        );
        const newItemsMap = new Map(
            items.map(item => [item.itemId, item.quantity])
        );

        // Update stock for changed items
        for (const item of items) {
            if (item.itemId) {
                const oldQty = existingItemsMap.get(item.itemId) || 0;
                const diff = item.quantity - oldQty;
                if (diff !== 0) {
                    try {
                        await MenuItemModel.updateStock(item.itemId, -diff);
                    } catch (stockError) {
                        console.error(`Failed to update stock for ${item.itemId}:`, stockError);
                    }
                }
            }
        }

        // Restore stock for removed items
        for (const [itemId, oldQty] of existingItemsMap) {
            if (!newItemsMap.has(itemId)) {
                try {
                    await MenuItemModel.updateStock(itemId, oldQty);
                } catch (stockError) {
                    console.error(`Failed to restore stock for ${itemId}:`, stockError);
                }
            }
        }

        const updatedBill = await BillingModel.update(billId, {
            customer: customer || existingBill.customer,
            items,
            barItems,
            kitchenItems,
            subtotal,
            tax,
            total,
            status: status || 'open',
        });

        res.json({
            success: true,
            data: updatedBill,
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
