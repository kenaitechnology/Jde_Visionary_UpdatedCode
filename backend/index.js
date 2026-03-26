const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const shipmentRoutes = require('./routes/shipments');
const supplierRoutes = require('./routes/suppliers');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const salesOrderRoutes = require('./routes/salesOrders');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// API Routes - Public
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);      // Read-only JDE data
app.use('/api/shipments', shipmentRoutes);      // Read-only JDE data  
app.use('/api/suppliers', supplierRoutes);      // Read-only JDE data
app.use('/api/purchase-orders', purchaseOrderRoutes); // Read-only JDE data
app.use('/api/sales-orders', salesOrderRoutes);     // Read-only JDE data
app.use('/api/analytics', analyticsRoutes);     // Read-only aggregated data

// Protected routes (add more as needed)
// app.use('/api/protected', authenticateToken, protectedRoutes);

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'JDE Visionary REST API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requires token)'
      },
      data: [
        'GET /api/inventory',
        'GET /api/shipments', 
        'GET /api/suppliers',
        'GET /api/purchase-orders',
        'GET /api/sales-orders',
        'GET /api/analytics/overview'
      ],
      health: 'GET /health',
      docs: 'GET /api'
    },
    docs: 'Use Bearer token for auth. All endpoints support ?status=pending&category=electronics filtering.'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend API server running at http://localhost:${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
});

