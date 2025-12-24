// Billing Model - DynamoDB Operations
const {
    PutCommand,
    GetCommand,
    ScanCommand,
    QueryCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class BillingModel {
    // Create a new bill
    static async create(billData) {
        const billId = billData.billId || `BILL-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

        const bill = {
            billId,
            customer: billData.customer,
            items: billData.items,
            barItems: billData.barItems || [],
            kitchenItems: billData.kitchenItems || [],
            subtotal: billData.subtotal,
            tax: billData.tax,
            total: billData.total,
            status: billData.status || 'completed',
            paymentMethod: billData.paymentMethod || 'cash',
            createdAt: new Date().toISOString(),
        };

        const params = {
            TableName: TABLES.BILLING,
            Item: bill,
        };

        await docClient.send(new PutCommand(params));
        return bill;
    }

    // Get all bills
    static async getAll(limit = 100) {
        const params = {
            TableName: TABLES.BILLING,
            Limit: limit,
        };

        const result = await docClient.send(new ScanCommand(params));
        // Sort by createdAt descending
        const bills = result.Items || [];
        return bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get bill by ID
    static async getById(billId) {
        const params = {
            TableName: TABLES.BILLING,
            Key: { billId },
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
    static async updateStatus(billId, status) {
        const params = {
            TableName: TABLES.BILLING,
            Key: { billId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': status,
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }
}

module.exports = BillingModel;
