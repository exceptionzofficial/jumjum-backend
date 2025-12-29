// User Model - DynamoDB Operations for Authentication
const {
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamodb');
const crypto = require('crypto');

class UserModel {
    // Hash password using SHA256
    static hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    // Generate simple token
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Create a new user
    static async create(userData) {
        const userId = `USER-${Date.now()}`;
        const hashedPassword = this.hashPassword(userData.password);

        const user = {
            userId,
            username: userData.username.toLowerCase(),
            password: hashedPassword,
            name: userData.name,
            role: userData.role, // 'bar', 'kitchen', or 'admin'
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const params = {
            TableName: TABLES.USERS || 'jamjam-users',
            Item: user,
            ConditionExpression: 'attribute_not_exists(username)',
        };

        try {
            await docClient.send(new PutCommand(params));
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('Username already exists');
            }
            throw error;
        }
    }

    // Find user by username
    static async findByUsername(username) {
        const params = {
            TableName: TABLES.USERS || 'jamjam-users',
            FilterExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username.toLowerCase(),
            },
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items?.[0] || null;
    }

    // Validate login credentials
    static async validateLogin(username, password, role) {
        const user = await this.findByUsername(username);

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }

        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('Invalid password');
        }

        // Check role if provided
        if (role && user.role !== role && user.role !== 'admin') {
            throw new Error(`User is not authorized for ${role} role`);
        }

        // Generate token
        const token = this.generateToken();

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
        };
    }

    // Get all users
    static async getAll() {
        const params = {
            TableName: TABLES.USERS || 'jamjam-users',
        };

        const result = await docClient.send(new ScanCommand(params));
        // Remove passwords from results
        return (result.Items || []).map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }

    // Update user
    static async update(userId, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updates).forEach((key, index) => {
            if (key !== 'userId' && key !== 'password') {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                updateExpressions.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updates[key];
            }
        });

        // If password is being updated, hash it
        if (updates.password) {
            updateExpressions.push('#password = :password');
            expressionAttributeNames['#password'] = 'password';
            expressionAttributeValues[':password'] = this.hashPassword(updates.password);
        }

        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: TABLES.USERS || 'jamjam-users',
            Key: { userId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        };

        const result = await docClient.send(new UpdateCommand(params));
        const { password, ...userWithoutPassword } = result.Attributes;
        return userWithoutPassword;
    }

    // Delete user
    static async delete(userId) {
        const params = {
            TableName: TABLES.USERS || 'jamjam-users',
            Key: { userId },
            ReturnValues: 'ALL_OLD',
        };

        const result = await docClient.send(new DeleteCommand(params));
        return result.Attributes;
    }

    // Seed default users
    static async seedDefaultUsers() {
        const defaultUsers = [
            { username: 'jamjambar', password: 'bar@123', name: 'Bar Staff', role: 'bar' },
            { username: 'jamjamkitchen', password: 'kitchen@123', name: 'Kitchen Staff', role: 'kitchen' },
            { username: 'admin', password: 'admin@123', name: 'Administrator', role: 'admin' },
        ];

        for (const userData of defaultUsers) {
            try {
                await this.create(userData);
                console.log(`Created user: ${userData.username}`);
            } catch (error) {
                if (error.message !== 'Username already exists') {
                    console.error(`Failed to create user ${userData.username}:`, error.message);
                }
            }
        }
    }
}

module.exports = UserModel;
