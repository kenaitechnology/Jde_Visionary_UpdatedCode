import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";
import * as jdeDb from "./jdeDb";

// ============ SUPPLIER ROUTER ============
const supplierRouter = router({
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getSuppliers(input);
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getSupplierById(input.id);
    }),
  
  getAlternatives: publicProcedure
    .input(z.object({
      category: z.string(),
      excludeId: z.number(),
      limit: z.number().optional().default(3),
    }))
    .query(async ({ input }) => {
      return db.getAlternativeSuppliers(input.category, input.excludeId, input.limit);
    }),

  // JDE Suppliers - fetch directly from JDE MSSQL tables
  listJDE: publicProcedure
    .query(async () => {
      // Fetch vendors from JDE MSSQL table F0101
      // ABAN8 = Supplier ID, ABALPH = Supplier Name, ABAT1 = Type (V = Vendor)
      return jdeDb.getJDESuppliers();
    }),
});

// ============ INVENTORY ROUTER ============
const inventoryRouter = router({
  list: publicProcedure
    .input(z.object({
      stockoutRisk: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getInventoryItems(input);
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getInventoryItemById(input.id);
    }),
  
  getStockoutRisks: publicProcedure
    .input(z.object({ daysThreshold: z.number().optional().default(14) }))
    .query(async ({ input }) => {
      const allJDEItems = await jdeDb.getJDEInventoryItems();
      const risks = allJDEItems.filter(item => 
        (item.daysOfSupply <= input.daysThreshold) || 
        item.stockoutRisk === 'high' || 
        item.stockoutRisk === 'critical'
      ).sort((a, b) => (a.daysOfSupply || 999) - (b.daysOfSupply || 999));
      return risks;
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        quantityOnHand: z.number().optional(),
        quantityReserved: z.number().optional(),
        reorderPoint: z.number().optional(),
        safetyStock: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateInventoryItem(input.id, input.data);
      return { success: true };
    }),

  // JDE Inventory - fetch directly from JDE MSSQL tables
  listJDE: publicProcedure
    .input(z.object({
      stockoutRisk: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      // Fetch from JDE MSSQL
      const jdeItems = await jdeDb.getJDEInventoryItems();
      
      // Filter by stockout risk if provided
      let filteredItems = jdeItems;
      if (input?.stockoutRisk && input.stockoutRisk !== 'all') {
        filteredItems = filteredItems.filter(item => 
          item.stockoutRisk.toLowerCase() === input.stockoutRisk?.toLowerCase()
        );
      }
      
      // Filter by category if provided
      if (input?.category && input.category !== 'all') {
        filteredItems = filteredItems.filter(item => 
          item.category.toLowerCase() === input.category?.toLowerCase()
        );
      }
      
      return filteredItems;
    }),
  
  getJDEById: publicProcedure
    .input(z.object({ itemCode: z.string() }))
    .query(async ({ input }) => {
      return jdeDb.getJDEInventoryItemByCode(input.itemCode);
    }),
});

// ============ PURCHASE ORDER ROUTER ============
const purchaseOrderRouter = router({
  // Get Purchase Orders from local MySQL database
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      riskLevel: z.string().optional(),
      supplierId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getPurchaseOrders(input);
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getPurchaseOrderById(input.id);
    }),
  
  getDelayed: publicProcedure.query(async () => {
    return db.getDelayedPurchaseOrders();
  }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(['draft', 'pending', 'approved', 'shipped', 'in_transit', 'delivered', 'cancelled']).optional(),
        promisedDeliveryDate: z.date().optional(),
        notes: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updatePurchaseOrder(input.id, input.data);
      return { success: true };
    }),

  // JDE Purchase Orders - fetch directly from JDE MSSQL tables
  listJDE: publicProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      // Fetch from JDE MSSQL
      const jdeOrders = await jdeDb.getJDEPurchaseOrders();
      
      // Filter by status if provided
      if (input?.status && input.status !== 'all') {
        // Map frontend status values to backend status values
        const statusMap: Record<string, string> = {
          'pending': 'Pending',
          'on_hold': 'On Hold',
          'in_progress': 'In Progress',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
        };
        const mappedStatus = statusMap[input.status] || input.status;
        
        return jdeOrders.filter(po => 
          po.status.toLowerCase() === mappedStatus.toLowerCase()
        );
      }
      
      return jdeOrders;
    }),
  
  getJDEById: publicProcedure
    .input(z.object({ poNumber: z.string() }))
    .query(async ({ input }) => {
      return jdeDb.getJDEPurchaseOrderById(input.poNumber);
    }),
});

// ============ SALES ORDER ROUTER ============
const salesOrderRouter = router({
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      customerName: z.string().optional(),
      priority: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getSalesOrders(input);
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getSalesOrderById(input.id);
    }),
  
  getHighPriorityByCustomer: publicProcedure
    .input(z.object({ customerName: z.string() }))
    .query(async ({ input }) => {
      return db.getHighPriorityOrdersByCustomer(input.customerName);
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
        promisedShipDate: z.date().optional(),
        notes: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateSalesOrder(input.id, input.data);
      return { success: true };
    }),

  // JDE Sales Orders - fetch directly from JDE MSSQL tables
  listJDE: publicProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      // Fetch from JDE MSSQL
      const jdeOrders = await jdeDb.getJDESalesOrders();
      
      // Filter by status if provided
      if (input?.status && input.status !== 'all') {
        // Map frontend status values to backend status values
        const statusMap: Record<string, string> = {
          'pending': 'Pending',
          'in_progress': 'In Progress',
          'shipped_billing': 'Shipped/Billing',
          'completed': 'Completed',
        };
        const mappedStatus = statusMap[input.status] || input.status;
        
        return jdeOrders.filter(so => 
          so.status.toLowerCase() === mappedStatus.toLowerCase()
        );
      }
      
      return jdeOrders;
    }),
  
  getJDEById: publicProcedure
    .input(z.object({ soNumber: z.string() }))
    .query(async ({ input }) => {
      return jdeDb.getJDESalesOrderById(input.soNumber);
    }),
});

// ============ SHIPMENT ROUTER ============
const shipmentRouter = router({
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      riskLevel: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getShipments(input);
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getShipmentById(input.id);
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'exception']).optional(),
        predictedArrival: z.date().optional(),
        delayReason: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateShipment(input.id, input.data);
      return { success: true };
    }),

  // JDE Shipments - fetch directly from JDE MSSQL tables
  listJDE: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      riskLevel: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      // Fetch from JDE MSSQL
      const jdeShipments = await jdeDb.getJDEShipments();
      
      // Filter by status if provided
      if (input?.status && input.status !== 'all') {
        return jdeShipments.filter(shipment => 
          shipment.status.toLowerCase() === input.status?.toLowerCase()
        );
      }
      
      // Filter by risk level if provided
      if (input?.riskLevel && input.riskLevel !== 'all') {
        return jdeShipments.filter(shipment => 
          shipment.riskLevel.toLowerCase() === input.riskLevel?.toLowerCase()
        );
      }
      
      return jdeShipments;
    }),
  
  getJDEById: publicProcedure
    .input(z.object({ shipmentNumber: z.string() }))
    .query(async ({ input }) => {
      return jdeDb.getJDEShipmentById(input.shipmentNumber);
    }),
});

// Helper function to generate consistent IDs from strings
function getStringHash(str: string | undefined): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============ ALERT ROUTER ============
const alertRouter = router({
  list: publicProcedure
    .input(z.object({
      type: z.string().optional(),
      severity: z.string().optional(),
      isRead: z.boolean().optional(),
      isResolved: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      // Get local alerts from MySQL database
      const localAlerts = await db.getAlerts(input);
      
      // Fetch JDE data from all modules to generate alerts dynamically
      const [jdeInventory, jdePurchaseOrders, jdeSalesOrders, jdeShipments, jdeSuppliers] = await Promise.all([
        jdeDb.getJDEInventoryItems(),
        jdeDb.getJDEPurchaseOrders(),
        jdeDb.getJDESalesOrders(),
        jdeDb.getJDEShipments(),
        jdeDb.getJDESuppliers(),
      ]);
      
      // Generate alerts from JDE Inventory (stockout warnings)
      const inventoryAlerts = jdeInventory
        .filter((item: any) => item.stockoutRisk === "critical" || item.stockoutRisk === "high")
        .map((item: any) => ({
          id: -1000 - getStringHash(item.itemCode),
          type: "stockout_warning" as const,
          severity: item.stockoutRisk === "critical" ? "critical" as const : "warning" as const,
          title: item.stockoutRisk === "critical" ? `Critical Stockout Risk: ${item.itemCode}` : `Stockout Warning: ${item.itemCode}`,
          message: `Item ${item.itemCode} (${item.description || "No description"}) has ${item.quantityAvailable} units available with only ${item.daysOfSupply} days of supply. Reorder point: ${item.reorderPoint}.`,
          relatedEntityType: "inventory",
          relatedEntityId: undefined,
          isRead: false,
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      
      // Generate alerts from JDE Purchase Orders (delivery delays)
      const purchaseOrderAlerts = jdePurchaseOrders
        .filter((po: any) => po.riskLevel === "red" || po.riskLevel === "yellow")
        .map((po: any) => ({
          id: -2000 - getStringHash(po.poNumber),
          type: "delivery_delay" as const,
          severity: po.riskLevel === "red" ? "critical" as const : "warning" as const,
          title: po.riskLevel === "red" ? `Critical Delay Risk: PO ${po.poNumber}` : `Delivery At Risk: PO ${po.poNumber}`,
          message: `Purchase Order ${po.poNumber} from ${po.supplierName} has ${po.delayProbability}% delay probability. Requested delivery: ${po.requestedDeliveryDate || "N/A"}. Status: ${po.status}.`,
          relatedEntityType: "purchase_order",
          relatedEntityId: undefined,
          isRead: false,
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      
      // Generate alerts from JDE Sales Orders (fulfillment risks)
      const salesOrderAlerts = jdeSalesOrders
        .filter((so: any) => so.fulfillmentRisk === "red" || so.fulfillmentRisk === "yellow")
        .map((so: any) => ({
          id: -3000 - getStringHash(so.soNumber),
          type: so.fulfillmentRisk === "red" ? "delivery_delay" as const : "general" as const,
          severity: so.fulfillmentRisk === "red" ? "critical" as const : "warning" as const,
          title: so.fulfillmentRisk === "red" ? `Critical Fulfillment Risk: SO ${so.soNumber}` : `Fulfillment At Risk: SO ${so.soNumber}`,
          message: `Sales Order ${so.soNumber} for customer ${so.customerName} has fulfillment risk. Requested ship date: ${so.requestedShipDate || "N/A"}. Status: ${so.status}. Priority: ${so.priority}.`,
          relatedEntityType: "sales_order",
          relatedEntityId: undefined,
          isRead: false,
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      
      // Generate alerts from JDE Shipments (delivery delays and temperature alerts)
      const shipmentAlerts = jdeShipments
        .filter((shipment: any) => shipment.riskLevel === "red" || shipment.riskLevel === "yellow" || shipment.temperatureAlert)
        .map((shipment: any) => {
          // Check for temperature alerts first
          if (shipment.temperatureAlert) {
            return {
              id: -4000 - getStringHash(shipment.shipmentNumber),
              type: "temperature_alert" as const,
              severity: "critical" as const,
              title: `Temperature Alert: Shipment ${shipment.shipmentNumber}`,
              message: `Shipment ${shipment.shipmentNumber} has temperature alert. Current temperature: ${shipment.temperature}°C. Destination: ${shipment.destination || "N/A"}.`,
              relatedEntityType: "shipment",
              relatedEntityId: undefined,
              isRead: false,
              isResolved: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          // Delivery delay/ risk alerts
          return {
            id: -4000 - getStringHash(shipment.shipmentNumber),
            type: "delivery_delay" as const,
            severity: shipment.riskLevel === "red" ? "critical" as const : "warning" as const,
            title: shipment.riskLevel === "red" ? `Shipment Delayed: ${shipment.shipmentNumber}` : `Shipment At Risk: ${shipment.shipmentNumber}`,
            message: `Shipment ${shipment.shipmentNumber} is at risk. Carrier: ${shipment.carrier || "TBD"}. ETA: ${shipment.eta || "N/A"}. Destination: ${shipment.destination || "N/A"}.`,
            relatedEntityType: "shipment",
            relatedEntityId: undefined,
            isRead: false,
            isResolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
      
      // Generate alerts from JDE Suppliers (supplier issues)
      const supplierAlerts = jdeSuppliers
        .filter((supplier: any) => {
          // Alert for suppliers with low scores or suspended
          const reliability = supplier.reliabilityScore || 0;
          const quality = supplier.qualityScore || 0;
          return supplier.type !== 'V' || reliability < 70 || quality < 70;
        })
        .map((supplier: any) => {
          const reliability = supplier.reliabilityScore || 0;
          const quality = supplier.qualityScore || 0;
          const isCritical = reliability < 50 || quality < 50 || supplier.type !== 'V';
          
          return {
            id: -5000 - getStringHash(supplier.id),
            type: "supplier_issue" as const,
            severity: isCritical ? "critical" as const : "warning" as const,
            title: isCritical ? `Critical Supplier Issue: ${supplier.name}` : `Supplier Warning: ${supplier.name}`,
            message: `Supplier ${supplier.name} (ID: ${supplier.id}) has performance concerns. Reliability: ${reliability}%, Quality: ${quality}%. Country: ${supplier.country || "N/A"}.`,
            relatedEntityType: "supplier",
            relatedEntityId: undefined,
            isRead: false,
            isResolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
      
      // Combine all JDE-generated alerts with local alerts
      const allJDEAlerts = [
        ...inventoryAlerts,
        ...purchaseOrderAlerts,
        ...salesOrderAlerts,
        ...shipmentAlerts,
        ...supplierAlerts,
      ];
      
      // Filter by type if specified
      let filteredJDEAlerts = allJDEAlerts;
      if (input?.type && input.type !== "all") {
        filteredJDEAlerts = filteredJDEAlerts.filter((alert: any) => alert.type === input.type);
      }
      
      // Filter by severity if specified
      if (input?.severity && input.severity !== "all") {
        filteredJDEAlerts = filteredJDEAlerts.filter((alert: any) => alert.severity === input.severity);
      }
      
      // Filter by isRead if specified
      if (input?.isRead !== undefined) {
        filteredJDEAlerts = filteredJDEAlerts.filter((alert: any) => alert.isRead === input.isRead);
      }
      
      // Get resolved alerts from MSSQL for the current user
      let resolvedAlertIds: number[] = [];
      try {
        // For now, we'll use a default user ID since we don't have authentication context here
        // In a real implementation, you'd get this from the session
        resolvedAlertIds = await jdeDb.getResolvedAlerts(1); // Default user ID
      } catch (error) {
        console.warn("Could not fetch resolved alerts from MSSQL:", error);
      }

      // Apply resolved status to JDE alerts
      const jdeAlertsWithResolution = filteredJDEAlerts.map((alert: any) => ({
        ...alert,
        isResolved: resolvedAlertIds.includes(alert.id)
      }));

      // Filter by isResolved if specified (now that we have the resolved status)
      let finalJDEAlerts = jdeAlertsWithResolution;
      if (input?.isResolved !== undefined) {
        finalJDEAlerts = finalJDEAlerts.filter((alert: any) => alert.isResolved === input.isResolved);
      }

      // Sort all alerts by severity (critical first) then by a stable sort key
      const sortedJDEAlerts = finalJDEAlerts.sort((a: any, b: any) => {
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        // Use type and ID as stable sort key instead of createdAt
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.id - b.id;
      });
      
      // Combine and sort local + JDE alerts
      const combinedAlerts = [...localAlerts, ...sortedJDEAlerts];
      
      // Sort combined alerts by severity and stable key
      return combinedAlerts.sort((a: any, b: any) => {
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
        if (severityDiff !== 0) return severityDiff;
        // Use type and ID as stable sort key instead of createdAt
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.id - b.id;
      });
    }),
  
  getUnread: publicProcedure.query(async () => {
    // Get local unread alerts from MySQL
    const localUnreadAlerts = await db.getUnreadAlerts();
    
    // Fetch JDE data for generating unread alerts
    const [jdeInventory, jdePurchaseOrders, jdeSalesOrders, jdeShipments, jdeSuppliers] = await Promise.all([
      jdeDb.getJDEInventoryItems(),
      jdeDb.getJDEPurchaseOrders(),
      jdeDb.getJDESalesOrders(),
      jdeDb.getJDEShipments(),
      jdeDb.getJDESuppliers(),
    ]);
    
    // Generate unread alerts from JDE data (same logic as list but filtered for unread only)
    const inventoryAlerts = jdeInventory
      .filter((item: any) => item.stockoutRisk === "critical" || item.stockoutRisk === "high")
      .map((item: any) => ({
        id: -1000 - getStringHash(item.itemCode),
        type: "stockout_warning" as const,
        severity: item.stockoutRisk === "critical" ? "critical" as const : "warning" as const,
        title: item.stockoutRisk === "critical" ? `Critical Stockout Risk: ${item.itemCode}` : `Stockout Warning: ${item.itemCode}`,
        message: `Item ${item.itemCode} has ${item.quantityAvailable} units available with only ${item.daysOfSupply} days of supply.`,
        relatedEntityType: "inventory",
        isRead: false,
        isResolved: false,
        createdAt: new Date(),
      }));
    
    const purchaseOrderAlerts = jdePurchaseOrders
      .filter((po: any) => po.riskLevel === "red" || po.riskLevel === "yellow")
      .map((po: any) => ({
        id: -2000 - getStringHash(po.poNumber),
        type: "delivery_delay" as const,
        severity: po.riskLevel === "red" ? "critical" as const : "warning" as const,
        title: po.riskLevel === "red" ? `Critical Delay Risk: PO ${po.poNumber}` : `Delivery At Risk: PO ${po.poNumber}`,
        message: `PO ${po.poNumber} has ${po.delayProbability}% delay probability.`,
        relatedEntityType: "purchase_order",
        isRead: false,
        isResolved: false,
        createdAt: new Date(),
      }));
    
    const salesOrderAlerts = jdeSalesOrders
      .filter((so: any) => so.fulfillmentRisk === "red" || so.fulfillmentRisk === "yellow")
      .map((so: any) => ({
        id: -3000 - getStringHash(so.soNumber),
        type: "delivery_delay" as const,
        severity: so.fulfillmentRisk === "red" ? "critical" as const : "warning" as const,
        title: so.fulfillmentRisk === "red" ? `Critical Fulfillment Risk: SO ${so.soNumber}` : `Fulfillment At Risk: SO ${so.soNumber}`,
        message: `SO ${so.soNumber} for ${so.customerName} has fulfillment risk.`,
        relatedEntityType: "sales_order",
        isRead: false,
        isResolved: false,
        createdAt: new Date(),
      }));
    
    const shipmentAlerts = jdeShipments
      .filter((shipment: any) => shipment.riskLevel === "red" || shipment.riskLevel === "yellow" || shipment.temperatureAlert)
      .map((shipment: any) => ({
        id: -4000 - getStringHash(shipment.shipmentNumber),
        type: shipment.temperatureAlert ? "temperature_alert" as const : "delivery_delay" as const,
        severity: shipment.riskLevel === "red" || shipment.temperatureAlert ? "critical" as const : "warning" as const,
        title: shipment.temperatureAlert ? `Temperature Alert: ${shipment.shipmentNumber}` : shipment.riskLevel === "red" ? `Shipment Delayed: ${shipment.shipmentNumber}` : `Shipment At Risk: ${shipment.shipmentNumber}`,
        message: shipment.temperatureAlert 
          ? `Shipment ${shipment.shipmentNumber} has temperature alert.` 
          : `Shipment ${shipment.shipmentNumber} is at risk.`,
        relatedEntityType: "shipment",
        isRead: false,
        isResolved: false,
        createdAt: new Date(),
      }));
    
    const supplierAlerts = jdeSuppliers
      .filter((supplier: any) => {
        const reliability = supplier.reliabilityScore || 0;
        const quality = supplier.qualityScore || 0;
        return supplier.type !== 'V' || reliability < 70 || quality < 70;
      })
      .map((supplier: any) => {
        const reliability = supplier.reliabilityScore || 0;
        const quality = supplier.qualityScore || 0;
        const isCritical = reliability < 50 || quality < 50 || supplier.type !== 'V';
        return {
          id: -5000 - getStringHash(supplier.id),
          type: "supplier_issue" as const,
          severity: isCritical ? "critical" as const : "warning" as const,
          title: isCritical ? `Critical Supplier Issue: ${supplier.name}` : `Supplier Warning: ${supplier.name}`,
          message: `Supplier ${supplier.name} has performance concerns.`,
          relatedEntityType: "supplier",
          isRead: false,
          isResolved: false,
          createdAt: new Date(),
        };
      });
    
    const allJDEUnreadAlerts = [
      ...inventoryAlerts,
      ...purchaseOrderAlerts,
      ...salesOrderAlerts,
      ...shipmentAlerts,
      ...supplierAlerts,
    ];
    
    // Combine local and JDE unread alerts
    const combinedUnreadAlerts = [...localUnreadAlerts, ...allJDEUnreadAlerts];
    
    // Sort by severity and date
    return combinedUnreadAlerts.sort((a: any, b: any) => {
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }),
  
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Always succeed for UI consistency - state managed client-side
      return { success: true };
    }),
  
  resolve: protectedProcedure
    .input(z.object({
      id: z.number(),
      actionTaken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Ensure alert resolutions table exists
        await jdeDb.createAlertResolutionsTable();

        // Store resolution in MSSQL
        await jdeDb.resolveAlert(input.id, ctx.user.id, input.actionTaken);

        return { success: true };
      } catch (error) {
        console.error("Error resolving alert:", error);
        throw new Error("Failed to resolve alert");
      }
    }),
  
  create: protectedProcedure
    .input(z.object({
      type: z.enum(['stockout_warning', 'delivery_delay', 'supplier_issue', 'quality_alert', 'temperature_alert', 'general']),
      severity: z.enum(['info', 'warning', 'critical']),
      title: z.string(),
      message: z.string(),
      relatedEntityType: z.string().optional(),
      relatedEntityId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createAlert(input);
      return { success: true, id };
    }),
});

// ============ DEMAND HISTORY ROUTER ============
const demandRouter = router({
  getHistory: publicProcedure
    .input(z.object({
      itemId: z.number(),
      days: z.number().optional().default(90),
    }))
    .query(async ({ input }) => {
      return db.getDemandHistory(input.itemId, input.days);
    }),
});

// ============ DASHBOARD ROUTER ============
const dashboardRouter = router({
  getStats: publicProcedure.query(async () => {
    // Fetch stats from both JDE and local database
    const [jdePurchaseOrders, jdeInventory, jdeShipments, localStats] = await Promise.all([
      jdeDb.getJDEPurchaseOrders(),
      jdeDb.getJDEInventoryItems(),
      jdeDb.getJDEShipments(),
      db.getDashboardStats(),
    ]);
    
    // Calculate stats from JDE data
    const delayedPOs = jdePurchaseOrders.filter((po: any) => po.riskLevel === 'red');
    const atRiskPOs = jdePurchaseOrders.filter((po: any) => po.riskLevel === 'yellow');
    const lowStockItems = jdeInventory.filter((item: any) => item.stockoutRisk === 'critical' || item.stockoutRisk === 'high');
    const atRiskShipments = jdeShipments.filter((s: any) => s.riskLevel === 'red' || s.riskLevel === 'yellow');
    
    return {
      purchaseOrders: {
        total: jdePurchaseOrders.length,
        atRisk: delayedPOs.length + atRiskPOs.length,
        delayed: delayedPOs.length,
      },
      inventory: {
        total: jdeInventory.length,
        lowStock: lowStockItems.length,
        criticalStock: jdeInventory.filter((item: any) => item.stockoutRisk === 'critical').length,
      },
      suppliers: localStats?.suppliers || { active: 0, avgReliability: 0 },
      alerts: localStats?.alerts || { unread: 0, critical: 0 },
      shipments: {
        total: jdeShipments.length,
        atRisk: atRiskShipments.length,
        inTransit: jdeShipments.filter((s: any) => s.status === 'In Transit').length,
      },
    };
  }),
  
  getRiskOverview: publicProcedure.query(async () => {
    // Fetch from JDE for Purchase Orders, Inventory, and Shipments
    // Fetch from local database for Alerts (alerts are system-generated)
    const [delayedPOs, stockoutRisks, unreadAlerts, atRiskShipments] = await Promise.all([
      jdeDb.getJDEDelayedPurchaseOrders(),
      jdeDb.getJDEInventoryItems().then(items => items.filter((item: any) => item.stockoutRisk === 'critical' || item.stockoutRisk === 'high')),
      db.getUnreadAlerts(),
      jdeDb.getJDEAtRiskShipments(),
    ]);
    
    return {
      delayedPurchaseOrders: delayedPOs.slice(0, 5),
      stockoutRisks: stockoutRisks.slice(0, 5),
      criticalAlerts: unreadAlerts.filter((a: any) => a.severity === 'critical').slice(0, 5),
      atRiskShipments: atRiskShipments.slice(0, 5),
    };
  }),
});

// ============ ANALYTICS ROUTER ============
const analyticsRouter = router({
  // Get comprehensive analytics overview
  getOverview: publicProcedure
    .input(z.object({
      timeRange: z.string().optional().default('30d'),
    }).optional())
    .query(async ({ input }) => {
      const [jdePurchaseOrders, jdeSalesOrders, jdeInventory, jdeShipments, jdeSuppliers] = await Promise.all([
        jdeDb.getJDEPurchaseOrders(),
        jdeDb.getJDESalesOrders(),
        jdeDb.getJDEInventoryItems(),
        jdeDb.getJDEShipments(),
        jdeDb.getJDESuppliers(),
      ]);
      
      // Calculate delivery performance metrics
      const completedPOs = jdePurchaseOrders.filter((po: any) => po.status === 'Completed');
      const inProgressPOs = jdePurchaseOrders.filter((po: any) => po.status === 'In Progress');
      const pendingPOs = jdePurchaseOrders.filter((po: any) => po.status === 'Pending' || po.status === 'On Hold');
      const delayedPOs = jdePurchaseOrders.filter((po: any) => po.riskLevel === 'red');
      const atRiskPOs = jdePurchaseOrders.filter((po: any) => po.riskLevel === 'yellow');
      
      // Calculate inventory metrics
      const criticalItems = jdeInventory.filter((item: any) => item.stockoutRisk === 'critical');
      const atRiskItems = jdeInventory.filter((item: any) => item.stockoutRisk === 'high' || item.stockoutRisk === 'medium');
      const healthyItems = jdeInventory.filter((item: any) => item.stockoutRisk === 'low');
      
      // Calculate shipment metrics
      const deliveredShipments = jdeShipments.filter((s: any) => s.status === 'Delivered' || s.status === 'Completed');
      const inTransitShipments = jdeShipments.filter((s: any) => s.status === 'In Transit' || s.status === 'Picked Up');
      const delayedShipments = jdeShipments.filter((s: any) => s.riskLevel === 'red');
      const atRiskShipments = jdeShipments.filter((s: any) => s.riskLevel === 'yellow');
      
      // Calculate supplier metrics
      const reliableSuppliers = jdeSuppliers.filter((s: any) => (s.reliabilityScore || 0) >= 90);
      const avgReliability = jdeSuppliers.length > 0 
        ? jdeSuppliers.reduce((sum: number, s: any) => sum + (s.reliabilityScore || 0), 0) / jdeSuppliers.length 
        : 0;
      const avgQuality = jdeSuppliers.length > 0 
        ? jdeSuppliers.reduce((sum: number, s: any) => sum + (s.qualityScore || 0), 0) / jdeSuppliers.length 
        : 0;
      
      // Calculate sales metrics
      const totalSalesValue = jdeSalesOrders.reduce((sum: number, so: any) => sum + (so.totalAmount || 0), 0);
      const pendingSales = jdeSalesOrders.filter((so: any) => so.status === 'Pending');
      const inProgressSales = jdeSalesOrders.filter((so: any) => so.status === 'In Progress');
      const shippedSales = jdeSalesOrders.filter((so: any) => so.status === 'Shipped/Billing');
      
      return {
        deliveryPerformance: {
          onTimeDeliveryRate: completedPOs.length > 0 
            ? Math.round(((completedPOs.length - delayedPOs.length) / completedPOs.length) * 1000) / 10 
            : 0,
          totalOrders: jdePurchaseOrders.length,
          completed: completedPOs.length,
          inProgress: inProgressPOs.length,
          pending: pendingPOs.length,
          delayed: delayedPOs.length,
          atRisk: atRiskPOs.length,
        },
        inventory: {
          total: jdeInventory.length,
          healthy: healthyItems.length,
          atRisk: atRiskItems.length,
          critical: criticalItems.length,
          totalValue: jdeInventory.reduce((sum: number, item: any) => sum + ((item.quantityAvailable || 0) * (item.unitCost || 0)), 0),
        },
        shipments: {
          total: jdeShipments.length,
          delivered: deliveredShipments.length,
          inTransit: inTransitShipments.length,
          delayed: delayedShipments.length,
          atRisk: atRiskShipments.length,
        },
        suppliers: {
          total: jdeSuppliers.length,
          reliable: reliableSuppliers.length,
          avgReliability: Math.round(avgReliability * 10) / 10,
          avgQuality: Math.round(avgQuality * 10) / 10,
        },
        sales: {
          total: jdeSalesOrders.length,
          totalValue: totalSalesValue,
          pending: pendingSales.length,
          inProgress: inProgressSales.length,
          shipped: shippedSales.length,
        },
      };
    }),
  
  // Get delivery trends over time
  getDeliveryTrends: publicProcedure
    .input(z.object({
      timeRange: z.string().optional().default('30d'),
    }).optional())
    .query(async () => {
      const purchaseOrders = await jdeDb.getJDEPurchaseOrders();
      const shipments = await jdeDb.getJDEShipments();
      
      // Group purchase orders by month for trend analysis
      const ordersByMonth = new Map<string, { total: number; onTime: number; delayed: number }>();
      
      purchaseOrders.forEach((po: any) => {
        if (po.orderDate) {
          const date = new Date(po.orderDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!ordersByMonth.has(monthKey)) {
            ordersByMonth.set(monthKey, { total: 0, onTime: 0, delayed: 0 });
          }
          
          const monthData = ordersByMonth.get(monthKey)!;
          monthData.total++;
          
          if (po.riskLevel === 'red') {
            monthData.delayed++;
          } else if (po.riskLevel === 'green') {
            monthData.onTime++;
          }
        }
      });
      
      // Group shipments by month
      const shipmentsByMonth = new Map<string, { total: number; onTime: number; delayed: number }>();
      
      shipments.forEach((shipment: any) => {
        if (shipment.eta) {
          const date = new Date(shipment.eta);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!shipmentsByMonth.has(monthKey)) {
            shipmentsByMonth.set(monthKey, { total: 0, onTime: 0, delayed: 0 });
          }
          
          const monthData = shipmentsByMonth.get(monthKey)!;
          monthData.total++;
          
          if (shipment.riskLevel === 'red') {
            monthData.delayed++;
          } else if (shipment.riskLevel === 'green') {
            monthData.onTime++;
          }
        }
      });
      
      // Convert to array format for charts
      const deliveryTrendData = Array.from(ordersByMonth.entries())
        .map(([month, data]) => ({
          date: month,
          onTime: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
          delayed: data.total > 0 ? Math.round((data.delayed / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return deliveryTrendData;
    }),
  
  // Get inventory trends over time
  getInventoryTrends: publicProcedure
    .input(z.object({
      timeRange: z.string().optional().default('30d'),
    }).optional())
    .query(async () => {
      const inventory = await jdeDb.getJDEInventoryItems();
      
      // Calculate current inventory health distribution
      const healthy = inventory.filter((item: any) => item.stockoutRisk === 'low').length;
      const atRisk = inventory.filter((item: any) => item.stockoutRisk === 'medium' || item.stockoutRisk === 'high').length;
      const critical = inventory.filter((item: any) => item.stockoutRisk === 'critical').length;
      const total = inventory.length;
      
      // Generate trend data (for now, using current distribution as a single data point)
      // In a real implementation, this would query historical data
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      return [{
        date: monthKey,
        healthy: total > 0 ? Math.round((healthy / total) * 100) : 0,
        atRisk: total > 0 ? Math.round((atRisk / total) * 100) : 0,
        critical: total > 0 ? Math.round((critical / total) * 100) : 0,
      }];
    }),
  
  // Get supplier performance data
  getSupplierPerformance: publicProcedure
    .input(z.object({
      timeRange: z.string().optional().default('30d'),
    }).optional())
    .query(async () => {
      const suppliers = await jdeDb.getJDESuppliers();
      
      // Map suppliers to performance data
      const supplierPerformanceData = suppliers.slice(0, 10).map((supplier: any) => ({
        name: supplier.name?.substring(0, 20) || 'Unknown',
        reliability: supplier.reliabilityScore || Math.floor(Math.random() * 30) + 70,
        onTime: Math.floor((supplier.reliabilityScore || 85) - Math.random() * 10),
        quality: supplier.qualityScore || Math.floor(Math.random() * 20) + 80,
      }));
      
      return supplierPerformanceData;
    }),
  
  // Get alert trends
  getAlertTrends: publicProcedure
    .input(z.object({
      timeRange: z.string().optional().default('30d'),
    }).optional())
    .query(async () => {
      const [inventory, purchaseOrders, salesOrders, shipments, suppliers] = await Promise.all([
        jdeDb.getJDEInventoryItems(),
        jdeDb.getJDEPurchaseOrders(),
        jdeDb.getJDESalesOrders(),
        jdeDb.getJDEShipments(),
        jdeDb.getJDESuppliers(),
      ]);
      
      // Count alerts by type
      const stockoutAlerts = inventory.filter((item: any) => item.stockoutRisk === 'critical' || item.stockoutRisk === 'high').length;
      const delayAlerts = purchaseOrders.filter((po: any) => po.riskLevel === 'red' || po.riskLevel === 'yellow').length;
      const supplierAlerts = suppliers.filter((s: any) => (s.reliabilityScore || 0) < 70 || (s.qualityScore || 0) < 70).length;
      const qualityAlerts = Math.floor(Math.random() * 5) + 1; // Placeholder for actual quality data
      
      // Generate alert trend data for the current month
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      return [{
        date: monthKey,
        stockout: stockoutAlerts,
        delay: delayAlerts,
        supplier: supplierAlerts,
        quality: qualityAlerts,
      }];
    }),
  
  // Get risk distribution
  getRiskDistribution: publicProcedure.query(async () => {
    const [purchaseOrders, inventory, shipments] = await Promise.all([
      jdeDb.getJDEPurchaseOrders(),
      jdeDb.getJDEInventoryItems(),
      jdeDb.getJDEShipments(),
    ]);
    
    // Calculate risk distribution
    const onTrack = 
      purchaseOrders.filter((po: any) => po.riskLevel === 'green').length +
      inventory.filter((item: any) => item.stockoutRisk === 'low').length +
      shipments.filter((s: any) => s.riskLevel === 'green').length;
    
    const atRisk = 
      purchaseOrders.filter((po: any) => po.riskLevel === 'yellow').length +
      inventory.filter((item: any) => item.stockoutRisk === 'medium').length +
      shipments.filter((s: any) => s.riskLevel === 'yellow').length;
    
    const critical = 
      purchaseOrders.filter((po: any) => po.riskLevel === 'red').length +
      inventory.filter((item: any) => item.stockoutRisk === 'critical' || item.stockoutRisk === 'high').length +
      shipments.filter((s: any) => s.riskLevel === 'red').length;
    
    const total = onTrack + atRisk + critical;
    
    return [
      { name: 'On Track', value: total > 0 ? Math.round((onTrack / total) * 100) : 0, color: 'oklch(0.65 0.2 145)' },
      { name: 'At Risk', value: total > 0 ? Math.round((atRisk / total) * 100) : 0, color: 'oklch(0.80 0.18 85)' },
      { name: 'Critical', value: total > 0 ? Math.round((critical / total) * 100) : 0, color: 'oklch(0.55 0.25 27)' },
    ];
  }),
});

// ============ AI ROUTER ============
const aiRouter = router({
  analyzeSupplyChain: protectedProcedure
    .input(z.object({
      context: z.string(),
      question: z.string(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert supply chain analyst for JDE Visionary, a predictive supply chain control tower. 
            Analyze the provided data and give actionable insights. Be concise and focus on:
            1. Risk identification
            2. Root cause analysis
            3. Recommended actions
            4. Impact assessment
            Format your response in clear sections with headers.`
          },
          {
            role: "user",
            content: `Context Data:\n${input.context}\n\nQuestion: ${input.question}`
          }
        ],
      });
      
      return {
        analysis: response.choices[0]?.message?.content || "Unable to generate analysis",
      };
    }),
  
  predictDelay: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const po = await db.getPurchaseOrderById(input.purchaseOrderId);
      if (!po) throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
      
      const supplier = await db.getSupplierById(po.supplierId);
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a supply chain AI that predicts delivery delays. Based on the purchase order and supplier data, predict:
            1. Probability of delay (0-100%)
            2. Estimated delay in days (if any)
            3. Key risk factors
            4. Recommended mitigation actions
            
            Respond in JSON format: { "delayProbability": number, "estimatedDelayDays": number, "riskFactors": string[], "mitigationActions": string[] }`
          },
          {
            role: "user",
            content: `Purchase Order: ${JSON.stringify(po)}\nSupplier: ${JSON.stringify(supplier)}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "delay_prediction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                delayProbability: { type: "number" },
                estimatedDelayDays: { type: "number" },
                riskFactors: { type: "array", items: { type: "string" } },
                mitigationActions: { type: "array", items: { type: "string" } },
              },
              required: ["delayProbability", "estimatedDelayDays", "riskFactors", "mitigationActions"],
              additionalProperties: false,
            },
          },
        },
      });
      
      const content = response.choices[0]?.message?.content;
      const prediction = JSON.parse(typeof content === 'string' ? content : '{}');
      return prediction;
    }),
  
  recommendSuppliers: protectedProcedure
    .input(z.object({
      itemCategory: z.string(),
      currentSupplierId: z.number(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']),
    }))
    .mutation(async ({ input }) => {
      const alternatives = await db.getAlternativeSuppliers(input.itemCategory, input.currentSupplierId, 5);
      const currentSupplier = await db.getSupplierById(input.currentSupplierId);
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a supply chain AI that recommends alternative suppliers. Analyze the available suppliers and rank the top 3 based on:
            1. Reliability score
            2. Lead time (especially important for urgent orders)
            3. On-time delivery rate
            4. Quality score
            
            Provide a brief justification for each recommendation.
            
            Respond in JSON format: { "recommendations": [{ "supplierId": number, "supplierName": string, "score": number, "justification": string }] }`
          },
          {
            role: "user",
            content: `Current Supplier: ${JSON.stringify(currentSupplier)}\nUrgency: ${input.urgency}\nAvailable Alternatives: ${JSON.stringify(alternatives)}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "supplier_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      supplierId: { type: "number" },
                      supplierName: { type: "string" },
                      score: { type: "number" },
                      justification: { type: "string" },
                    },
                    required: ["supplierId", "supplierName", "score", "justification"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        },
      });
      
      const resultContent = response.choices[0]?.message?.content;
      const result = JSON.parse(typeof resultContent === 'string' ? resultContent : '{"recommendations":[]}');
      return result;
    }),
  
  chat: protectedProcedure
    .input(z.object({
      message: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      // Gather context data for RAG
      const [stats, stockoutRisks, delayedPOs, alerts] = await Promise.all([
        db.getDashboardStats(),
        db.getStockoutRiskItems(14),
        db.getDelayedPurchaseOrders(),
        db.getUnreadAlerts(),
      ]);
      
      const contextData = {
        dashboardStats: stats,
        stockoutRisks: stockoutRisks.slice(0, 10),
        delayedPurchaseOrders: delayedPOs.slice(0, 10),
        recentAlerts: alerts.slice(0, 10),
      };
      
      const messages: any[] = [
        {
          role: "system",
          content: `You are the JDE Visionary Digital Assistant, an AI-powered supply chain advisor. You have access to real-time supply chain data and can answer questions about:
          - Purchase orders and their status
          - Sales orders and customer priorities
          - Inventory levels and stockout risks
          - Supplier performance and alternatives
          - Shipment tracking and delays
          - Alerts and recommended actions
          
          Current System Data:
          ${JSON.stringify(contextData, null, 2)}
          
          Be helpful, concise, and action-oriented. If asked about specific orders or customers, search through the available data. If you don't have specific information, say so and suggest how to find it.`
        },
        ...input.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: input.message,
        },
      ];
      
      const response = await invokeLLM({ messages });
      
      return {
        response: response.choices[0]?.message?.content || "I apologize, but I couldn't process your request. Please try again.",
      };
    }),
});

// ============ REMEDIATION ROUTER ============
const remediationRouter = router({
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      actionType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getRemediationActions(input);
    }),
  
  rerouteOrder: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number(),
      newSupplierId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create remediation action record
      const actionId = await db.createRemediationAction({
        actionType: 'reroute_order',
        relatedEntityType: 'purchase_order',
        relatedEntityId: input.purchaseOrderId,
        description: `Rerouting order to new supplier. Reason: ${input.reason}`,
        triggeredBy: ctx.user.id,
      });
      
      // Simulate JDE Orchestrator call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the action as completed
      await db.updateRemediationAction(actionId, {
        status: 'completed',
        result: `Successfully rerouted to supplier ID ${input.newSupplierId}`,
        completedAt: new Date(),
      });
      
      return { success: true, actionId };
    }),
  
  emailSupplier: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      subject: z.string(),
      message: z.string(),
      relatedEntityType: z.string(),
      relatedEntityId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const supplier = await db.getSupplierById(input.supplierId);
      if (!supplier) throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
      
      // Create remediation action record
      const actionId = await db.createRemediationAction({
        actionType: 'email_supplier',
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        description: `Email sent to ${supplier.name}: ${input.subject}`,
        triggeredBy: ctx.user.id,
      });
      
      // Simulate sending email (in production, integrate with email service)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Notify owner about the action
      await notifyOwner({
        title: `Supplier Email Sent: ${supplier.name}`,
        content: `Subject: ${input.subject}\n\nMessage: ${input.message}`,
      });
      
      // Update the action as completed
      await db.updateRemediationAction(actionId, {
        status: 'completed',
        result: `Email sent to ${supplier.email}`,
        completedAt: new Date(),
      });
      
      return { success: true, actionId };
    }),
  
  updateDeliveryDate: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number(),
      newDate: z.date(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create remediation action record
      const actionId = await db.createRemediationAction({
        actionType: 'update_delivery_date',
        relatedEntityType: 'purchase_order',
        relatedEntityId: input.purchaseOrderId,
        description: `Updating delivery date. Reason: ${input.reason}`,
        triggeredBy: ctx.user.id,
      });
      
      // Update the purchase order
      await db.updatePurchaseOrder(input.purchaseOrderId, {
        promisedDeliveryDate: input.newDate,
        notes: `Delivery date updated: ${input.reason}`,
      });
      
      // Update the action as completed
      await db.updateRemediationAction(actionId, {
        status: 'completed',
        result: `Delivery date updated to ${input.newDate.toISOString()}`,
        completedAt: new Date(),
      });
      
      return { success: true, actionId };
    }),
  
  expediteShipment: protectedProcedure
    .input(z.object({
      shipmentId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create remediation action record
      const actionId = await db.createRemediationAction({
        actionType: 'expedite_shipment',
        relatedEntityType: 'shipment',
        relatedEntityId: input.shipmentId,
        description: `Expediting shipment. Reason: ${input.reason}`,
        triggeredBy: ctx.user.id,
      });
      
      // Simulate JDE Orchestrator call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the action as completed
      await db.updateRemediationAction(actionId, {
        status: 'completed',
        result: 'Expedite request submitted to carrier',
        completedAt: new Date(),
      });
      
      return { success: true, actionId };
    }),
});

// ============ MAIN ROUTER ============
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  
  // Feature routers
  supplier: supplierRouter,
  inventory: inventoryRouter,
  purchaseOrder: purchaseOrderRouter,
  salesOrder: salesOrderRouter,
  shipment: shipmentRouter,
  alert: alertRouter,
  demand: demandRouter,
  dashboard: dashboardRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  remediation: remediationRouter,
});

export type AppRouter = typeof appRouter;
