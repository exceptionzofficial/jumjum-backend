// Menu Items Model - DynamoDB Operations
const {
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamodb');

class MenuItemModel {
    // Create a new menu item
    static async create(item) {
        const params = {
            TableName: TABLES.MENU_ITEMS,
            Item: {
                itemId: item.itemId,
                name: item.name,
                price: item.price,
                category: item.category,
                stock: item.stock || 0,
                lowStockThreshold: item.lowStockThreshold || 10,
                isKitchen: item.isKitchen || false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(itemId)',
        };

        try {
            await docClient.send(new PutCommand(params));
            return params.Item;
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('Item with this ID already exists');
            }
            throw error;
        }
    }

    // Get all menu items
    static async getAll() {
        const params = {
            TableName: TABLES.MENU_ITEMS,
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    }

    // Get menu items by type (bar or kitchen)
    static async getByType(isKitchen) {
        const params = {
            TableName: TABLES.MENU_ITEMS,
            FilterExpression: 'isKitchen = :isKitchen',
            ExpressionAttributeValues: {
                ':isKitchen': isKitchen,
            },
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    }

    // Get menu item by ID
    static async getById(itemId) {
        const params = {
            TableName: TABLES.MENU_ITEMS,
            Key: { itemId },
        };

        const result = await docClient.send(new GetCommand(params));
        return result.Item;
    }

    // Update menu item
    static async update(itemId, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // Build dynamic update expression
        Object.keys(updates).forEach((key, index) => {
            if (key !== 'itemId') {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                updateExpressions.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updates[key];
            }
        });

        // Add updatedAt
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: TABLES.MENU_ITEMS,
            Key: { itemId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }

    // Update stock
    static async updateStock(itemId, quantity) {
        const params = {
            TableName: TABLES.MENU_ITEMS,
            Key: { itemId },
            UpdateExpression: 'SET stock = stock + :quantity, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':quantity': quantity,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        return result.Attributes;
    }

    // Delete menu item
    static async delete(itemId) {
        const params = {
            TableName: TABLES.MENU_ITEMS,
            Key: { itemId },
            ReturnValues: 'ALL_OLD',
        };

        const result = await docClient.send(new DeleteCommand(params));
        return result.Attributes;
    }

    // Get low stock items
    static async getLowStock() {
        const params = {
            TableName: TABLES.MENU_ITEMS,
        };

        const result = await docClient.send(new ScanCommand(params));
        const items = result.Items || [];

        return items.filter(item => item.stock <= item.lowStockThreshold);
    }
}

module.exports = MenuItemModel;
