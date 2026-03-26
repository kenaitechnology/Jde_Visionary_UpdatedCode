const express = require('express');
const { getJDESuppliers } = require('../db/jde');

const router = express.Router();

// GET /api/suppliers - list JDE suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await getJDESuppliers();
    
    res.json({
      success: true,
      data: suppliers,
      total: suppliers.length
    });
  } catch (error) {
    console.error('Suppliers error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suppliers',
      details: error.message 
    });
  }
});

module.exports = router;

