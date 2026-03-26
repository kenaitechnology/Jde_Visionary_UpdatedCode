const express = require('express');
const { getJDEPurchaseOrders, getJDEPurchaseOrderById } = require('../db/jde');

const router = express.Router();

// GET /api/purchase-orders - list JDE POs
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let orders = await getJDEPurchaseOrders();
    
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
    console.error('POs list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch purchase orders',
      details: error.message 
    });
  }
});

// GET /api/purchase-orders/:poNumber
router.get('/:poNumber', async (req, res) => {
  try {
    const { poNumber } = req.params;
    const order = await getJDEPurchaseOrderById(poNumber);
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Purchase order not found',
        poNumber 
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('PO error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch purchase order',
      details: error.message 
    });
  }
});

module.exports = router;

