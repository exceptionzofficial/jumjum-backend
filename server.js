// JumJum Backend Server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const menuItemsRoutes = require('./src/routes/menuItems');
const billingRoutes = require('./src/routes/billing');
const authRoutes = require('./src/routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'JumJum Backend API is running!',
        version: '1.0.0',
        endpoints: {
            menuItems: '/api/menu-items',
            billing: '/api/billing',
        },
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu-items', menuItemsRoutes);
app.use('/api/billing', billingRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║         🍺 JumJum Backend Server Started           ║
╠════════════════════════════════════════════════════╣
║  Port: ${PORT}                                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}                       ║
║  DynamoDB Region: ${process.env.AWS_REGION || 'ap-south-1'}                  ║
╠════════════════════════════════════════════════════╣
║  API Endpoints:                                    ║
║  • GET  /api/menu-items         - All items        ║
║  • GET  /api/menu-items/bar     - Bar items        ║
║  • GET  /api/menu-items/kitchen - Kitchen items    ║
║  • POST /api/menu-items         - Create item      ║
║  • PUT  /api/menu-items/:id     - Update item      ║
║  • DEL  /api/menu-items/:id     - Delete item      ║
║  • GET  /api/billing            - All bills        ║
║  • POST /api/billing            - Create bill      ║
║  • GET  /api/billing/stats      - Revenue stats    ║
╚════════════════════════════════════════════════════╝
  `);
});
