import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getSuppliers: vi.fn().mockResolvedValue([
    {
      id: 1,
      supplierCode: "SUP-001",
      name: "Acme Corp",
      status: "active",
      category: "Electronics",
      country: "USA",
      leadTimeDays: 14,
      reliabilityScore: "95.5",
      onTimeDeliveryRate: "92.0",
      qualityScore: "98.0",
    },
  ]),
  getSupplierById: vi.fn().mockResolvedValue({
    id: 1,
    supplierCode: "SUP-001",
    name: "Acme Corp",
    status: "active",
    category: "Electronics",
    email: "contact@acme.com",
  }),
  getAlternativeSuppliers: vi.fn().mockResolvedValue([
    { id: 2, name: "Global Parts", reliabilityScore: "88.0" },
    { id: 3, name: "Tech Supply", reliabilityScore: "92.0" },
  ]),
  getInventoryItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      itemCode: "ELEC-001",
      description: "Electronic Component",
      category: "Electronics",
      quantityOnHand: 1000,
      quantityAvailable: 800,
      stockoutRisk: "low",
      daysOfSupply: 30,
    },
  ]),
  getStockoutRiskItems: vi.fn().mockResolvedValue([
    {
      id: 2,
      itemCode: "ELEC-002",
      description: "Critical Component",
      stockoutRisk: "critical",
      daysOfSupply: 3,
    },
  ]),
  getPurchaseOrders: vi.fn().mockResolvedValue([
    {
      id: 1,
      poNumber: "PO-2026-00001",
      supplierId: 1,
      status: "approved",
      riskLevel: "green",
      delayProbability: "15.0",
    },
  ]),
  getDelayedPurchaseOrders: vi.fn().mockResolvedValue([
    {
      id: 2,
      poNumber: "PO-2026-00002",
      riskLevel: "red",
      delayProbability: "85.0",
    },
  ]),
  getSalesOrders: vi.fn().mockResolvedValue([
    {
      id: 1,
      soNumber: "SO-2026-00001",
      customerName: "Test Customer",
      status: "confirmed",
      priority: "high",
    },
  ]),
  getShipments: vi.fn().mockResolvedValue([
    {
      id: 1,
      shipmentNumber: "SHP-001",
      carrier: "FedEx",
      status: "in_transit",
      riskLevel: "green",
    },
  ]),
  getAlerts: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Test Alert",
      message: "Test message",
      type: "stockout_warning",
      severity: "warning",
      isRead: false,
      isResolved: false,
    },
  ]),
  getUnreadAlerts: vi.fn().mockResolvedValue([
    { id: 1, title: "Unread Alert", isRead: false },
  ]),
  getDashboardStats: vi.fn().mockResolvedValue({
    purchaseOrders: { total: 50, atRisk: 5, delayed: 2 },
    inventory: { total: 100, lowStock: 10, criticalItems: 3 },
    alerts: { total: 20, unread: 6, critical: 2 },
    suppliers: { total: 15, active: 12, avgReliability: 91.5 },
  }),
  getRiskOverview: vi.fn().mockResolvedValue({
    delayedPurchaseOrders: [{ id: 1, poNumber: "PO-001", riskLevel: "red" }],
    stockoutRisks: [{ id: 1, itemCode: "ITEM-001", stockoutRisk: "critical" }],
    criticalAlerts: [{ id: 1, title: "Critical Alert", severity: "critical" }],
    atRiskShipments: [{ id: 1, shipmentNumber: "SHP-001", riskLevel: "yellow" }],
  }),
  markAlertAsRead: vi.fn().mockResolvedValue(undefined),
  resolveAlert: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "oauth",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Supplier Router", () => {
  it("lists suppliers successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.supplier.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("supplierCode");
    expect(result[0]).toHaveProperty("name");
  });

  it("gets supplier by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.supplier.getById({ id: 1 });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Acme Corp");
  });

  it("gets alternative suppliers", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.supplier.getAlternatives({
      category: "Electronics",
      excludeId: 1,
      limit: 3,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Inventory Router", () => {
  it("lists inventory items successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inventory.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("itemCode");
    expect(result[0]).toHaveProperty("quantityAvailable");
  });

  it("gets stockout risk items", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inventory.getStockoutRisks({ daysThreshold: 14 });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("stockoutRisk");
  });
});

describe("Purchase Order Router", () => {
  it("lists purchase orders successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchaseOrder.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("poNumber");
    expect(result[0]).toHaveProperty("status");
  });

  it("gets delayed purchase orders", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchaseOrder.getDelayed();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("riskLevel");
  });
});

describe("Sales Order Router", () => {
  it("lists sales orders successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.salesOrder.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("soNumber");
    expect(result[0]).toHaveProperty("customerName");
  });
});

describe("Shipment Router", () => {
  it("lists shipments successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shipment.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("shipmentNumber");
    expect(result[0]).toHaveProperty("carrier");
  });
});

describe("Alert Router", () => {
  it("lists alerts successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alert.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("severity");
  });

  it("gets unread alerts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alert.getUnread();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("marks alert as read when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alert.markAsRead({ id: 1 });

    expect(result).toEqual({ success: true });
  });
});

describe("Dashboard Router", () => {
  it("gets dashboard stats successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getStats();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("purchaseOrders");
    expect(result).toHaveProperty("inventory");
    expect(result).toHaveProperty("alerts");
    expect(result).toHaveProperty("suppliers");
  });

  it("gets risk overview successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getRiskOverview();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("delayedPurchaseOrders");
    expect(result).toHaveProperty("stockoutRisks");
    expect(result).toHaveProperty("criticalAlerts");
    expect(result).toHaveProperty("atRiskShipments");
  });
});
