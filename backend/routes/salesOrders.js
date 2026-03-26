const express = require('express');
const { getJDESalesOrders, getJDESalesOrderById } = require('../db/jde');

const router = express.Router();

// GET /api/sales-orders - list JDE sales orders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let orders = await getJDESalesOrders();
    
    if (status && status !== 'all') {
      orders = orders.filter(order => 
        order.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      data: orders,
      total: orders.length,
      filters: { status }
    });
  } catch (error) {
    console.error('SOs list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales orders',
      details: error.message 
    });
  }
});

// GET /api/sales-orders/:soNumber
router.get('/:soNumber', async (req, res) => {
  try {
    const { soNumber } = req.params;
    const order = await getJDESalesOrderById(soNumber);
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Sales order not found',
        soNumber 
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('SO error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales order',
      details: error.message 
    });
  }
});

module.exports = router;

