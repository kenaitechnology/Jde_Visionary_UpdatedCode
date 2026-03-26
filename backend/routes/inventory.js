const express = require('express');
const { getJDEInventoryItems, getJDEInventoryItemByCode } = require('../db/jde');

const router = express.Router();

// GET /api/inventory - list JDE inventory items
router.get('/', async (req, res) => {
  try {
    const { category, stockoutRisk } = req.query;
    
    let items = await getJDEInventoryItems();
    
    // Filter by category
    if (category && category !== 'all') {
      items = items.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by stockout risk
    if (stockoutRisk && stockoutRisk !== 'all') {
      items = items.filter(item => 
        item.stockoutRisk.toLowerCase() === stockoutRisk.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      data: items,
      total: items.length,
      filters: { category, stockoutRisk }
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory',
      details: error.message 
    });
  }
});

// GET /api/inventory/:itemCode - get specific JDE inventory item
router.get('/:itemCode', async (req, res) => {
  try {
    const { itemCode } = req.params;
    const item = await getJDEInventoryItemByCode(itemCode);
    
    if (!item) {
      return res.status(404).json({ 
        error: 'Inventory item not found',
        itemCode 
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Inventory item error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory item',
      details: error.message 
    });
  }
});

module.exports = router;

