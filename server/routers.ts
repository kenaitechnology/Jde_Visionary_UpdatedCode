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
      return db.getStockoutRiskItems(input.daysThreshold);
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
        return jdeOrders.filter(po => 
          po.status.toLowerCase() === input.status?.toLowerCase()
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
        return jdeOrders.filter(so => 
          so.status.toLowerCase() === input.status?.toLowerCase()
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
      return db.getAlerts(input);
    }),
  
  getUnread: publicProcedure.query(async () => {
    return db.getUnreadAlerts();
  }),
  
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.markAlertAsRead(input.id);
      return { success: true };
    }),
  
  resolve: protectedProcedure
    .input(z.object({
      id: z.number(),
      actionTaken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.resolveAlert(input.id, ctx.user.id, input.actionTaken);
      return { success: true };
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
    return db.getDashboardStats();
  }),
  
  getRiskOverview: publicProcedure.query(async () => {
    const [delayedPOs, stockoutRisks, unreadAlerts, shipments] = await Promise.all([
      db.getDelayedPurchaseOrders(),
      db.getStockoutRiskItems(14),
      db.getUnreadAlerts(),
      db.getShipments({ riskLevel: 'red' }),
    ]);
    
    return {
      delayedPurchaseOrders: delayedPOs.slice(0, 5),
      stockoutRisks: stockoutRisks.slice(0, 5),
      criticalAlerts: unreadAlerts.filter((a: any) => a.severity === 'critical').slice(0, 5),
      atRiskShipments: shipments.slice(0, 5),
    };
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
  ai: aiRouter,
  remediation: remediationRouter,
});

export type AppRouter = typeof appRouter;
