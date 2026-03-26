const express = require('express');
const { 
  getJDEInventoryItems, 
  getJDEPurchaseOrders, 
  getJDESalesOrders, 
  getJDEShipments, 
  getJDESuppliers 
} = require('../db/jde');

const router = express.Router();

// GET /api/analytics/overview - main dashboard metrics
router.get('/overview', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '30d';
    
    const [inventory, purchaseOrders, salesOrders, shipments, suppliers] = await Promise.all([
      getJDEInventoryItems(),
      getJDEPurchaseOrders(),
      getJDESalesOrders(),
      getJDEShipments(),
      getJDESuppliers()
    ]);

    // Calculate metrics matching frontend expectations
    const completedPOs = purchaseOrders.filter(po => po.status === 'Completed');
    const delayedPOs = purchaseOrders.filter(po => po.riskLevel === 'red');
    
    const criticalItems = inventory.filter(item => item.stockoutRisk === 'critical');
    const reliableSuppliers = suppliers.filter(s => (s.reliabilityScore || 0) >= 90);

    res.json({
      success: true,
      data: {
        deliveryPerformance: {
          onTimeDeliveryRate: completedPOs.length > 0 ? 
            Math.round(((completedPOs.length - delayedPOs.length) / completedPOs.length) * 1000) / 10 : 0,
          totalOrders: purchaseOrders.length,
          completed: completedPOs.length,
          delayed: delayedPOs.length,
        },
        inventory: {
          total: inventory.length,
          critical: criticalItems.length,
          totalValue: inventory.reduce((sum, item) => sum + (item.quantityAvailable * (item.unitCost || 0)), 0),
        },
        shipments: {
          total: shipments.length,
          delayed: shipments.filter(s => s.riskLevel === 'red').length,
        },
        suppliers: {
          total: suppliers.length,
          reliable: reliableSuppliers.length,
          avgReliability: Math.round(
            suppliers.reduce((sum, s) => sum + (s.reliabilityScore || 0), 0) / suppliers.length * 10
          ) / 10,
        },
        sales: {
          total: salesOrders.length,
          totalValue: salesOrders.reduce((sum, so) => sum + so.totalAmount, 0),
        }
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
});

// GET /api/analytics/risk-distribution
router.get('/risk-distribution', async (req, res) => {
  try {
    const [purchaseOrders, inventory, shipments] = await Promise.all([
      getJDEPurchaseOrders(),
      getJDEInventoryItems(),
      getJDEShipments(),
    ]);
    
    const onTrack = 
      purchaseOrders.filter(po => po.riskLevel === 'green').length +
      inventory.filter(item => item.stockoutRisk === 'low').length +
      shipments.filter(s => s.riskLevel === 'green').length;
    
    const atRisk = 
      purchaseOrders.filter(po => po.riskLevel === 'yellow').length +
      inventory.filter(item => item.stockoutRisk === 'medium').length +
      shipments.filter(s => s.riskLevel === 'yellow').length;
    
    const critical = 
      purchaseOrders.filter(po => po.riskLevel === 'red').length +
      inventory.filter(item => item.stockoutRisk === 'critical' || item.stockoutRisk === 'high').length +
      shipments.filter(s => s.riskLevel === 'red').length;
    
    const total = onTrack + atRisk + critical;
    
    res.json({
      success: true,
      data: [
        { name: 'On Track', value: total > 0 ? Math.round((onTrack / total) * 100) : 0, color: 'oklch(0.65 0.2 145)' },
        { name: 'At Risk', value: total > 0 ? Math.round((atRisk / total) * 100) : 0, color: 'oklch(0.80 0.18 85)' },
        { name: 'Critical', value: total > 0 ? Math.round((critical / total) * 100) : 0, color: 'oklch(0.55 0.25 27)' },
      ]
    });
  } catch (error) {
    console.error('Risk distribution error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch risk data',
      details: error.message 
    });
  }
});

module.exports = router;

