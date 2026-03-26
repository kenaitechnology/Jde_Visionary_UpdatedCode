const express = require('express');
const { getJDEShipments, getJDEShipmentById } = require('../db/jde');

const router = express.Router();

// GET /api/shipments - list JDE shipments  
router.get('/', async (req, res) => {
  try {
    const { status, riskLevel } = req.query;
    
    let shipments = await getJDEShipments();
    
    // Filter by status
    if (status && status !== 'all') {
      shipments = shipments.filter(shipment => 
        shipment.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Filter by risk level
    if (riskLevel && riskLevel !== 'all') {
      shipments = shipments.filter(shipment => 
        shipment.riskLevel.toLowerCase() === riskLevel.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      data: shipments,
      total: shipments.length,
      filters: { status, riskLevel }
    });
  } catch (error) {
    console.error('Shipments list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch shipments',
      details: error.message 
    });
  }
});

// GET /api/shipments/:shipmentNumber
router.get('/:shipmentNumber', async (req, res) => {
  try {
    const { shipmentNumber } = req.params;
    const shipment = await getJDEShipmentById(shipmentNumber);
    
    if (!shipment) {
      return res.status(404).json({ 
        error: 'Shipment not found',
        shipmentNumber 
      });
    }
    
    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    console.error('Shipment error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch shipment',
      details: error.message 
    });
  }
});

module.exports = router;

