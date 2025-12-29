// DynamoDB Configuration
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Create DynamoDB client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Create Document client for easier operations
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
    },
});

// Table names
const TABLES = {
    MENU_ITEMS: process.env.DYNAMODB_MENU_TABLE || 'jumjum-menu-items',
    BILLING: process.env.DYNAMODB_BILLING_TABLE || 'jumjum-bar-billing',
    USERS: process.env.DYNAMODB_USERS_TABLE || 'jamjam-users',
};

module.exports = {
    docClient,
    TABLES,
};
