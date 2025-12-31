// Kitchen Inventory Model - DynamoDB Operations
const {
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

// Define table name for kitchen inventory
const KITCHEN_INVENTORY_TABLE = 'jumjum-kitchen-inventory';

class KitchenInventoryModel {
    // Create a new inventory item
    static async create(itemData) {
        const inventoryId = `INV-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

        const item = {
            inventoryId,
            name: itemData.name,
            quantity: itemData.quantity || 0,
            unit: itemData.unit || 'pcs',
            minStock: itemData.minStock || 10,
            status: itemData.status || 'available', // available, low, out
            category: itemData.category || 'general',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastRefilled: null,
        };

        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Item: item,
        };

        await docClient.send(new PutCommand(params));
        return item;
    }

    // Get all inventory items
    static async getAll() {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
        };

        try {
            const result = await docClient.send(new ScanCommand(params));
            const items = result.Items || [];
            return items.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            // If table doesn't exist yet, return empty array
            if (error.name === 'ResourceNotFoundException') {
                return [];
            }
            throw error;
        }
    }

    // Get inventory by ID
    static async getById(inventoryId) {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Key: { inventoryId },
        };

        const result = await docClient.send(new GetCommand(params));
        return result.Item;
    }

    // Get low stock items
    static async getLowStock() {
        const items = await this.getAll();
        return items.filter(item => item.status === 'low' || item.status === 'out');
    }

    // Update inventory item
    static async update(inventoryId, updates) {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Key: { inventoryId },
            UpdateExpression: 'SET #name = :name, #quantity = :quantity, #unit = :unit, #minStock = :minStock, #status = :status, #category = :category, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#quantity': 'quantity',
                '#unit': 'unit',
                '#minStock': 'minStock',
                '#status': 'status',
                '#category': 'category',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':name': updates.name,
                ':quantity': updates.quantity,
                ':unit': updates.unit,
                ':minStock': updates.minStock,
                ':status': updates.status,
                ':category': updates.category || 'general',
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }

    // Update status only
    static async updateStatus(inventoryId, status) {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Key: { inventoryId },
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

    // Refill stock
    static async refill(inventoryId, quantity) {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Key: { inventoryId },
            UpdateExpression: 'SET #quantity = :quantity, #status = :status, #lastRefilled = :lastRefilled, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#quantity': 'quantity',
                '#status': 'status',
                '#lastRefilled': 'lastRefilled',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':quantity': quantity,
                ':status': 'available',
                ':lastRefilled': new Date().toISOString(),
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }

    // Delete inventory item
    static async delete(inventoryId) {
        const params = {
            TableName: KITCHEN_INVENTORY_TABLE,
            Key: { inventoryId },
        };

        await docClient.send(new DeleteCommand(params));
        return { success: true };
    }
}

module.exports = KitchenInventoryModel;
