import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Suppliers table (equivalent to JDE P04012 - Supplier Master)
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  supplierCode: varchar("supplierCode", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  leadTimeDays: int("leadTimeDays").default(7),
  reliabilityScore: decimal("reliabilityScore", { precision: 5, scale: 2 }).default("85.00"),
  onTimeDeliveryRate: decimal("onTimeDeliveryRate", { precision: 5, scale: 2 }).default("90.00"),
  qualityScore: decimal("qualityScore", { precision: 5, scale: 2 }).default("88.00"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Inventory Items table (equivalent to JDE P41202 - Item Availability)
 */
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  itemCode: varchar("itemCode", { length: 32 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }).default("EA"),
  quantityOnHand: int("quantityOnHand").default(0),
  quantityReserved: int("quantityReserved").default(0),
  quantityAvailable: int("quantityAvailable").default(0),
  reorderPoint: int("reorderPoint").default(100),
  safetyStock: int("safetyStock").default(50),
  averageDailyDemand: decimal("averageDailyDemand", { precision: 10, scale: 2 }).default("10.00"),
  daysOfSupply: int("daysOfSupply").default(30),
  stockoutRisk: mysqlEnum("stockoutRisk", ["low", "medium", "high", "critical"]).default("low"),
  predictedStockoutDate: timestamp("predictedStockoutDate"),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).default("0.00"),
  warehouseLocation: varchar("warehouseLocation", { length: 50 }),
  primarySupplierId: int("primarySupplierId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

/**
 * Purchase Orders table (equivalent to JDE F4311 - Purchase Order Detail)
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 32 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  itemId: int("itemId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  orderDate: timestamp("orderDate").notNull(),
  requestedDeliveryDate: timestamp("requestedDeliveryDate").notNull(),
  promisedDeliveryDate: timestamp("promisedDeliveryDate"),
  actualDeliveryDate: timestamp("actualDeliveryDate"),
  predictedDeliveryDate: timestamp("predictedDeliveryDate"),
  delayProbability: decimal("delayProbability", { precision: 5, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["draft", "pending", "approved", "shipped", "in_transit", "delivered", "cancelled"]).default("pending").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["green", "yellow", "red"]).default("green"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Sales Orders table (equivalent to JDE F4211 - Sales Order Detail)
 */
export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  soNumber: varchar("soNumber", { length: 32 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerCode: varchar("customerCode", { length: 32 }),
  itemId: int("itemId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  orderDate: timestamp("orderDate").notNull(),
  requestedShipDate: timestamp("requestedShipDate").notNull(),
  promisedShipDate: timestamp("promisedShipDate"),
  actualShipDate: timestamp("actualShipDate"),
  status: mysqlEnum("status", ["draft", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  fulfillmentRisk: mysqlEnum("fulfillmentRisk", ["green", "yellow", "red"]).default("green"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

/**
 * Shipments table (equivalent to JDE P4915 - Transportation)
 */
export const shipments = mysqlTable("shipments", {
  id: int("id").autoincrement().primaryKey(),
  shipmentNumber: varchar("shipmentNumber", { length: 32 }).notNull().unique(),
  purchaseOrderId: int("purchaseOrderId"),
  salesOrderId: int("salesOrderId"),
  carrier: varchar("carrier", { length: 100 }),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  origin: varchar("origin", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  estimatedDeparture: timestamp("estimatedDeparture"),
  actualDeparture: timestamp("actualDeparture"),
  estimatedArrival: timestamp("estimatedArrival"),
  predictedArrival: timestamp("predictedArrival"),
  actualArrival: timestamp("actualArrival"),
  status: mysqlEnum("status", ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "delayed", "exception"]).default("pending").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["green", "yellow", "red"]).default("green"),
  delayReason: text("delayReason"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  temperatureAlert: boolean("temperatureAlert").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

/**
 * Alerts table for notification system
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["stockout_warning", "delivery_delay", "supplier_issue", "quality_alert", "temperature_alert", "general"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false),
  isResolved: boolean("isResolved").default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  assignedTo: int("assignedTo"),
  actionTaken: text("actionTaken"),
  emailSent: boolean("emailSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Demand History for forecasting
 */
export const demandHistory = mysqlTable("demand_history", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  date: timestamp("date").notNull(),
  quantity: int("quantity").notNull(),
  source: mysqlEnum("source", ["sales", "forecast", "adjustment"]).default("sales"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DemandHistory = typeof demandHistory.$inferSelect;
export type InsertDemandHistory = typeof demandHistory.$inferInsert;

/**
 * Remediation Actions log
 */
export const remediationActions = mysqlTable("remediation_actions", {
  id: int("id").autoincrement().primaryKey(),
  actionType: mysqlEnum("actionType", ["reroute_order", "email_supplier", "update_delivery_date", "switch_supplier", "expedite_shipment", "other"]).notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }).notNull(),
  relatedEntityId: int("relatedEntityId").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending").notNull(),
  result: text("result"),
  triggeredBy: int("triggeredBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type RemediationAction = typeof remediationActions.$inferSelect;
export type InsertRemediationAction = typeof remediationActions.$inferInsert;
