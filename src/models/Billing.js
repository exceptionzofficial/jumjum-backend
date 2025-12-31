// Billing Model - DynamoDB Operations
const {
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class BillingModel {
    // Create a new bill
    static async create(billData) {
        // Use lowercase 'billid' to match DynamoDB table primary key
        const billid = `BILL-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

        const bill = {
            billid, // Primary key - lowercase to match DynamoDB
            billId: billid, // Also store as camelCase for API consistency
            customer: billData.customer,
            items: billData.items,
            barItems: billData.barItems || [],
            kitchenItems: billData.kitchenItems || [],
            subtotal: billData.subtotal,
            tax: billData.tax,
            total: billData.total,
            status: billData.status || 'open',
            paymentMethod: billData.paymentMethod || 'cash',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const params = {
            TableName: TABLES.BILLING,
            Item: bill,
        };

        await docClient.send(new PutCommand(params));
        return bill;
    }

    // Update an existing bill (add items, recalculate totals)
    static async update(billid, updates) {
        const { items, customer, barItems, kitchenItems, subtotal, tax, total, status } = updates;

        const params = {
            TableName: TABLES.BILLING,
            Key: { billid },
            UpdateExpression: 'SET #items = :items, #customer = :customer, #barItems = :barItems, #kitchenItems = :kitchenItems, #subtotal = :subtotal, #tax = :tax, #total = :total, #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#items': 'items',
                '#customer': 'customer',
                '#barItems': 'barItems',
                '#kitchenItems': 'kitchenItems',
                '#subtotal': 'subtotal',
                '#tax': 'tax',
                '#total': 'total',
                '#status': 'status',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':items': items,
                ':customer': customer,
                ':barItems': barItems || [],
                ':kitchenItems': kitchenItems || [],
                ':subtotal': subtotal,
                ':tax': tax,
                ':total': total,
                ':status': status || 'open',
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }

    // Find today's bill by phone number
    static async findTodayByPhone(phone) {
        if (!phone || phone.trim() === '') return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const params = {
            TableName: TABLES.BILLING,
            FilterExpression: 'createdAt BETWEEN :start AND :end',
            ExpressionAttributeValues: {
                ':start': today.toISOString(),
                ':end': tomorrow.toISOString(),
            },
        };

        const result = await docClient.send(new ScanCommand(params));
        const bills = result.Items || [];

        // Find bill with matching phone number
        const matchingBill = bills.find(bill => {
            const customerPhone = bill.customer?.phone || '';
            return customerPhone.trim() === phone.trim() && bill.status !== 'completed';
        });

        return matchingBill || null;
    }

    // Get all bills
    static async getAll(limit = 100) {
        const params = {
            TableName: TABLES.BILLING,
            Limit: limit,
        };

        const result = await docClient.send(new ScanCommand(params));
        const bills = result.Items || [];
        return bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get pending/open bills
    static async getPending() {
        const params = {
            TableName: TABLES.BILLING,
            FilterExpression: '#status = :open OR #status = :pending',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':open': 'open',
                ':pending': 'pending',
            },
        };

        const result = await docClient.send(new ScanCommand(params));
        const bills = result.Items || [];
        return bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get bill by ID
    static async getById(billid) {
        const params = {
            TableName: TABLES.BILLING,
            Key: { billid },
        };

        const result = await docClient.send(new GetCommand(params));
        return result.Item;
    }

    // Get bills by date range
    static async getByDateRange(startDate, endDate) {
        const params = {
            TableName: TABLES.BILLING,
            FilterExpression: 'createdAt BETWEEN :start AND :end',
            ExpressionAttributeValues: {
                ':start': startDate,
                ':end': endDate,
            },
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    }

    // Get today's bills
    static async getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getByDateRange(today.toISOString(), tomorrow.toISOString());
    }

    // Get revenue stats
    static async getStats() {
        const allBills = await this.getAll(1000);
        const todayBills = await this.getToday();

        const totalRevenue = allBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        const todayRevenue = todayBills.reduce((sum, bill) => sum + (bill.total || 0), 0);

        return {
            totalBills: allBills.length,
            todayBills: todayBills.length,
            totalRevenue,
            todayRevenue,
            avgOrderValue: allBills.length > 0 ? Math.round(totalRevenue / allBills.length) : 0,
        };
    }

    // Update bill status
    static async updateStatus(billid, status) {
        const params = {
            TableName: TABLES.BILLING,
            Key: { billid },
            UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }
}

module.exports = BillingModel;
