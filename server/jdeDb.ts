import sql from "mssql";
import { ENV } from "./_core/env";

export interface JDEEnv {
  MSSQL_HOST: string;
  MSSQL_PORT: number;
  MSSQL_USER: string;
  MSSQL_PASSWORD: string;
  MSSQL_DATABASE: string;
}

function getJDEConfig(): JDEEnv {
  return {
    MSSQL_HOST: ENV.mssqlHost || "localhost",
    MSSQL_PORT: ENV.mssqlPort || 1433,
    MSSQL_USER: ENV.mssqlUser || "",
    MSSQL_PASSWORD: ENV.mssqlPassword || "",
    MSSQL_DATABASE: ENV.mssqlDatabase || "JDE_AI",
  };
}

// Configuration for MSSQL connection
function getSqlConfig(): sql.config {
  const config = getJDEConfig();
  return {
    server: config.MSSQL_HOST,
    port: config.MSSQL_PORT,
    user: config.MSSQL_USER,
    password: config.MSSQL_PASSWORD,
    database: config.MSSQL_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: {
      max: 5,
      min: 1,
      idleTimeoutMillis: 60000,
    },
  };
}

// ============ SINGLETON CONNECTION POOL ============
let poolPromise: Promise<sql.ConnectionPool> | null = null;
let poolInstance: sql.ConnectionPool | null = null;

/**
 * Get or create the singleton connection pool
 * This ensures we reuse connections instead of creating new ones for each query
 */
async function getPool(): Promise<sql.ConnectionPool | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  // If we already have a connected pool, check if it's still valid
  if (poolInstance) {
    try {
      // Check if the pool is still connected
      if ((poolInstance as any).connected) {
        return poolInstance;
      }
      // Pool exists but disconnected, clear it
      poolInstance = null;
      poolPromise = null;
    } catch (e) {
      // Pool might be in a bad state, reset
      poolInstance = null;
      poolPromise = null;
    }
  }

  // If there's an existing promise, return it (avoid creating multiple connections)
  if (poolPromise) {
    try {
      poolInstance = await poolPromise;
      return poolInstance;
    } catch (e) {
      // Promise failed, reset and try again
      poolPromise = null;
      poolInstance = null;
    }
  }

  // Create new connection pool promise
  poolPromise = (async () => {
    try {
      console.log("[JDE Database] Creating new connection pool...");
      const pool = await sql.connect(getSqlConfig());
      
      poolInstance = pool;
      console.log("[JDE Database] Connection pool established successfully");
      return pool;
    } catch (error) {
      console.error("[JDE Database] Failed to create connection pool:", error);
      poolPromise = null;
      poolInstance = null;
      throw error;
    }
  })();

  return poolPromise;
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closeJDEDb(): Promise<void> {
  if (poolInstance) {
    try {
      await poolInstance.close();
      console.log("[JDE Database] Connection pool closed");
    } catch (error) {
      console.warn("[JDE Database] Error closing pool:", error);
    }
    poolInstance = null;
    poolPromise = null;
  }
}

/**
 * Check if the database connection is available
 */
export async function isJDEConnected(): Promise<boolean> {
  try {
    const pool = await getPool();
    return pool !== null && (pool as any).connected;
  } catch {
    return false;
  }
}

/**
 * Convert JDE Julian date (CYYDDD) to YYYY-MM-DD format
 */
function convertJDEJulianDate(julianDate: string | number | null | undefined): string {
  if (!julianDate) return "";
  
  const dateStr = String(julianDate).trim();
  if (!dateStr || dateStr === "0") return "";
  
  try {
    if (dateStr.includes("-") && dateStr.length === 10) {
      return dateStr;
    }
    
    if (dateStr.length === 6) {
      const c = parseInt(dateStr.charAt(0));
      const yy = parseInt(dateStr.substring(1, 3));
      const ddd = parseInt(dateStr.substring(3, 6));
      
      if (isNaN(c) || isNaN(yy) || isNaN(ddd)) {
        console.warn("[JDE Database] Invalid Julian date components:", dateStr);
        return dateStr;
      }
      
      const year = (c * 100) + 1900 + yy;
      
      if (ddd < 1 || ddd > 365) {
        console.warn("[JDE Database] Invalid day of year:", ddd, "for date:", dateStr);
        return dateStr;
      }
      
      const dateObj = new Date(year, 0, 1);
      dateObj.setDate(dateObj.getDate() + (ddd - 1));
      
      const formattedYear = dateObj.getFullYear();
      const formattedMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const formattedDay = String(dateObj.getDate()).padStart(2, '0');
      
      return `${formattedYear}-${formattedMonth}-${formattedDay}`;
    }
    
    let year: number, month: number, day: number;
    
    if (dateStr.length === 7) {
      const century = parseInt(dateStr.charAt(0));
      year = century === 0 ? 2000 + parseInt(dateStr.substring(1, 3)) : 1900 + parseInt(dateStr.substring(1, 3));
      month = parseInt(dateStr.substring(3, 5)) - 1;
      day = parseInt(dateStr.substring(5, 7));
    } else if (dateStr.length === 8) {
      year = parseInt(dateStr.substring(0, 4));
      month = parseInt(dateStr.substring(4, 6)) - 1;
      day = parseInt(dateStr.substring(6, 8));
    } else {
      return dateStr;
    }
    
    if (month < 0 || month > 11) {
      console.warn("[JDE Database] Invalid month:", month, "for date:", dateStr);
      return dateStr;
    }
    if (day < 1 || day > 31) {
      console.warn("[JDE Database] Invalid day:", day, "for date:", dateStr);
      return dateStr;
    }
    
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) {
      return dateStr;
    }
    
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  } catch (error) {
    console.warn("[JDE Database] Error converting JDE date:", error);
    return dateStr;
  }
}

function convertJEDate(julianDate: string | number | null | undefined): string {
  return convertJDEJulianDate(julianDate);
}

/**
 * Execute a query using the singleton connection pool
 */
export async function executeQuery<T>(query: string): Promise<T[]> {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn("[JDE Database] Cannot execute query: database not available");
      return [];
    }

    const request = pool.request();
    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error("[JDE Database] Query error:", error);
    return [];
  }
  // Note: We don't close the pool here because we're using a singleton connection pool
}

export interface JDEPurchaseOrder {
  poNumber: string;
  supplierName: string;
  orderDate: string;
  requestedDeliveryDate: string;
  status: string;
  riskLevel: string;
  delayProbability: number;
  id?: number;
}

export async function getJDEPurchaseOrders(): Promise<JDEPurchaseOrder[]> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return [];
  }

  const query = `
    SELECT
      RTRIM(CONVERT(VARCHAR, F4301.PHDOCO)) AS poNumber,
      RTRIM(ISNULL(F0101.ABALPH, 'Unknown Supplier')) AS supplierName,
      CASE 
        WHEN F4301.PHTRDJ IS NOT NULL AND F4301.PHTRDJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4301.PHTRDJ AS INT))
        ELSE ''
      END AS orderDate,
      CASE 
        WHEN F4311.PDDRQJ IS NOT NULL AND F4311.PDDRQJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4311.PDDRQJ AS INT))
        ELSE ''
      END AS requestedDeliveryDate,
      RTRIM(ISNULL(F4311.PDNXTR, '')) AS status
    FROM dbo.F4301 F4301
    INNER JOIN dbo.F4311 F4311 ON F4301.PHDOCO = F4311.PDDOCO AND F4301.PHDCTO = F4311.PDDCTO
    LEFT JOIN dbo.F0101 F0101 ON F4311.PDAN8 = F0101.ABAN8
    ORDER BY F4301.PHDOCO DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    return rows.map((row: any) => {
      const mappedStatus = mapJDEStatus(row.status);
      const riskData = calculateJDEPORisk(row.status, row.requestedDeliveryDate);
      
      return {
        poNumber: row.poNumber || "",
        supplierName: row.supplierName || "Unknown Supplier",
        orderDate: convertJEDate(row.orderDate),
        requestedDeliveryDate: convertJEDate(row.requestedDeliveryDate),
        status: mappedStatus,
        riskLevel: riskData.riskLevel,
        delayProbability: riskData.delayProbability,
      };
    });
  } catch (error) {
    console.error("[JDE Database] Error fetching purchase orders:", error);
    return [];
  }
}

function mapJDEStatus(nxtStatus: string): string {
  const statusMap: Record<string, string> = {
    "100": "Pending",
    "110": "Pending",
    "120": "Pending",
    "130": "Pending",
    "215": "Pending",
    "160": "On Hold",
    "180": "In Progress",
    "220": "In Progress",
    "230": "In Progress",
    "240": "In Progress",
    "250": "In Progress",
    "280": "In Progress",
    "380": "In Progress",
    "400": "Completed",
    "999": "Cancelled",
    "": "Pending",
  };
  
  const trimmed = nxtStatus?.trim() || "";
  return statusMap[trimmed] || "Pending";
}

function calculateJDEPORisk(status: string, deliveryDate: string): { riskLevel: string; delayProbability: number } {
  if (status === "400" || status === "Completed") {
    return { riskLevel: "green", delayProbability: 5 };
  }
  
  if (status === "999" || status === "Cancelled") {
    return { riskLevel: "green", delayProbability: 5 };
  }
  
  if (status === "160" || status === "On Hold") {
    return { riskLevel: "yellow", delayProbability: 40 };
  }
  
  if (deliveryDate) {
    try {
      let year: number, month: number, day: number;
      const dateStr = deliveryDate.toString();
      
      if (dateStr.length === 6) {
        const c = parseInt(dateStr.charAt(0));
        const yy = parseInt(dateStr.substring(1, 3));
        const ddd = parseInt(dateStr.substring(3, 6));
        year = (c * 100) + 1900 + yy;
        const dateObj = new Date(year, 0, 1);
        dateObj.setDate(dateObj.getDate() + (ddd - 1));
        month = dateObj.getMonth();
        day = dateObj.getDate();
      } else if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else if (dateStr.length === 7) {
        const century = parseInt(dateStr.charAt(0));
        year = century === 0 ? 2000 + parseInt(dateStr.substring(1, 3)) : 1900 + parseInt(dateStr.substring(1, 3));
        month = parseInt(dateStr.substring(3, 5)) - 1;
        day = parseInt(dateStr.substring(5, 7));
      } else if (dateStr.length === 8) {
        year = parseInt(dateStr.substring(0, 4));
        month = parseInt(dateStr.substring(4, 6)) - 1;
        day = parseInt(dateStr.substring(6, 8));
      } else {
        return { riskLevel: "yellow", delayProbability: 35 };
      }
      
      const deliveryDateObj = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysUntilDelivery = Math.ceil((deliveryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDelivery < 0) {
        return { riskLevel: "red", delayProbability: 85 };
      } else if (daysUntilDelivery <= 3) {
        return { riskLevel: "red", delayProbability: 75 };
      } else if (daysUntilDelivery <= 7) {
        return { riskLevel: "yellow", delayProbability: 50 };
      } else if (daysUntilDelivery <= 14) {
        return { riskLevel: "yellow", delayProbability: 30 };
      } else {
        return { riskLevel: "green", delayProbability: 15 };
      }
    } catch (e) {
      console.warn("[JDE Database] Error parsing delivery date:", e);
      return { riskLevel: "yellow", delayProbability: 35 };
    }
  }
  
  return { riskLevel: "yellow", delayProbability: 35 };
}

export async function getJDEPurchaseOrderById(poNumber: string): Promise<JDEPurchaseOrder | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  const query = `
    SELECT TOP 1
      RTRIM(CONVERT(VARCHAR, F4301.PHDOCO)) AS poNumber,
      RTRIM(ISNULL(F0101.ABALPH, 'Unknown Supplier')) AS supplierName,
      CASE 
        WHEN F4301.PHTRDJ IS NOT NULL AND F4301.PHTRDJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4301.PHTRDJ AS INT))
        ELSE ''
      END AS orderDate,
      CASE 
        WHEN F4311.PDDRQJ IS NOT NULL AND F4311.PDDRQJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4311.PDDRQJ AS INT))
        ELSE ''
      END AS requestedDeliveryDate,
      RTRIM(ISNULL(F4311.PDNXTR, '')) AS status
    FROM dbo.F4301 F4301
    INNER JOIN dbo.F4311 F4311 ON F4301.PHDOCO = F4311.PDDOCO AND F4301.PHDCTO = F4311.PDDCTO
    LEFT JOIN dbo.F0101 F0101 ON F4311.PDAN8 = F0101.ABAN8
    WHERE RTRIM(CONVERT(VARCHAR, F4301.PHDOCO)) = '${poNumber}'
    ORDER BY F4301.PHDOCO DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const mappedStatus = mapJDEStatus(row.status);
    const riskData = calculateJDEPORisk(row.status, row.requestedDeliveryDate);
    
    return {
      poNumber: row.poNumber || "",
      supplierName: row.supplierName || "Unknown Supplier",
      orderDate: convertJEDate(row.orderDate),
      requestedDeliveryDate: convertJEDate(row.requestedDeliveryDate),
      status: mappedStatus,
      riskLevel: riskData.riskLevel,
      delayProbability: riskData.delayProbability,
    };
  } catch (error) {
    console.error("[JDE Database] Error fetching purchase order:", error);
    return null;
  }
}

// ============ JDE SALES ORDER INTERFACE ============
export interface JDESalesOrder {
  soNumber: string;
  customerName: string;
  itemNumber: string;
  secondItemNumber: string;
  thirdItemNumber: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  requestedShipDate: string;
  status: string;
  priority: string;
  fulfillmentRisk: string;
}

export async function getJDESalesOrders(): Promise<JDESalesOrder[]> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return [];
  }

  const query = `
    SELECT
      RTRIM(CONVERT(VARCHAR, F4211.SDDOCO)) AS soNumber,
      RTRIM(ISNULL(F0101.ABALPH, 'Unknown Customer')) AS customerName,
      RTRIM(CONVERT(VARCHAR, F4211.SDITM)) AS itemNumber,
      RTRIM(ISNULL(F4211.SDLITM, '')) AS secondItemNumber,
      RTRIM(ISNULL(F4211.SDAITM, '')) AS thirdItemNumber,
      COALESCE(TRY_CAST(F4211.SDUORG AS FLOAT), 0) AS quantity,
      COALESCE(TRY_CAST(F4211.SDUPRC AS FLOAT), 0) AS unitPrice,
      (COALESCE(TRY_CAST(F4211.SDUORG AS FLOAT), 0) * COALESCE(TRY_CAST(F4211.SDUPRC AS FLOAT), 0)) AS totalAmount,
      CASE 
        WHEN F4211.SDDRQJ IS NOT NULL AND F4211.SDDRQJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4211.SDDRQJ AS INT))
        ELSE ''
      END AS requestedShipDate,
      RTRIM(ISNULL(F4211.SDNXTR, '')) AS status,
      RTRIM(ISNULL(F4211.SDPRIO, '')) AS priority
    FROM dbo.F4211 F4211
    INNER JOIN dbo.F4201 F4201 ON F4211.SDDOCO = F4201.SHDOCO AND F4211.SDDCTO = F4201.SHDCTO
    LEFT JOIN dbo.F0101 F0101 ON F4201.SHAN8 = F0101.ABAN8
    ORDER BY F4211.SDDOCO DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    return rows.map((row: any) => ({
      soNumber: row.soNumber || "",
      customerName: row.customerName || "Unknown Customer",
      itemNumber: row.itemNumber || "",
      secondItemNumber: row.secondItemNumber || "",
      thirdItemNumber: row.thirdItemNumber || "",
      quantity: Number(row.quantity) || 0,
      unitPrice: Number(row.unitPrice) || 0,
      totalAmount: Number(row.totalAmount) || 0,
      requestedShipDate: convertJEDate(row.requestedShipDate),
      status: mapJDESOStatus(row.status),
      priority: mapJDESOPriority(row.priority),
      fulfillmentRisk: calculateJDESORisk(row.status, row.requestedShipDate),
    }));
  } catch (error) {
    console.error("[JDE Database] Error fetching sales orders:", error);
    return [];
  }
}

function mapJDESOStatus(nxtStatus: string): string {
  const statusCode = parseInt(nxtStatus?.trim() || "0", 10);
  
  if (statusCode >= 527 && statusCode <= 545) {
    return "Pending";
  }
  
  if (statusCode >= 550 && statusCode <= 578) {
    return "In Progress";
  }
  
  if (statusCode >= 580 && statusCode <= 620) {
    return "Shipped/Billing";
  }
  
  if (statusCode === 999) {
    return "Completed";
  }
  
  if (!nxtStatus || nxtStatus.trim() === "") {
    return "Pending";
  }
  
  return nxtStatus.trim();
}

function mapJDESOPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    "1": "Critical",
    "2": "High",
    "3": "Medium",
    "4": "Low",
    "5": "Low",
    "": "Medium",
  };
  
  const trimmed = priority?.trim() || "";
  return priorityMap[trimmed] || "Medium";
}

function calculateJDESORisk(status: string, shipDate: string): string {
  const statusCode = parseInt(status?.trim() || "0", 10);
  
  if (statusCode === 999) {
    return "green";
  }
  
  if (statusCode >= 580 && statusCode <= 620) {
    return "green";
  }
  
  if (shipDate) {
    try {
      const dateStr = shipDate.toString();
      let year: number, month: number, day: number;
      
      if (dateStr.length === 6) {
        const c = parseInt(dateStr.charAt(0));
        const yy = parseInt(dateStr.substring(1, 3));
        const ddd = parseInt(dateStr.substring(3, 6));
        year = (c * 100) + 1900 + yy;
        const dateObj = new Date(year, 0, 1);
        dateObj.setDate(dateObj.getDate() + (ddd - 1));
        month = dateObj.getMonth();
        day = dateObj.getDate();
      } else if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else if (dateStr.length === 7) {
        const century = parseInt(dateStr.charAt(0));
        year = century === 0 ? 2000 + parseInt(dateStr.substring(1, 3)) : 1900 + parseInt(dateStr.substring(1, 3));
        month = parseInt(dateStr.substring(3, 5)) - 1;
        day = parseInt(dateStr.substring(5, 7));
      } else if (dateStr.length === 8) {
        year = parseInt(dateStr.substring(0, 4));
        month = parseInt(dateStr.substring(4, 6)) - 1;
        day = parseInt(dateStr.substring(6, 8));
      } else {
        return "yellow";
      }
      
      const shipDateObj = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysUntilShip = Math.ceil((shipDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilShip < 0) {
        return "red";
      } else if (daysUntilShip <= 3) {
        return "red";
      } else if (daysUntilShip <= 7) {
        return "yellow";
      }
    } catch (e) {
      console.warn("[JDE Database] Error parsing ship date:", e);
    }
  }
  
  return "yellow";
}

export async function getJDESalesOrderById(soNumber: string): Promise<JDESalesOrder | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  const query = `
    SELECT TOP 1
      RTRIM(CONVERT(VARCHAR, F4211.SDDOCO)) AS soNumber,
      RTRIM(ISNULL(F0101.ABALPH, 'Unknown Customer')) AS customerName,
      RTRIM(CONVERT(VARCHAR, F4211.SDITM)) AS itemNumber,
      RTRIM(ISNULL(F4211.SDLITM, '')) AS secondItemNumber,
      RTRIM(ISNULL(F4211.SDAITM, '')) AS thirdItemNumber,
      COALESCE(TRY_CAST(F4211.SDUORG AS FLOAT), 0) AS quantity,
      COALESCE(TRY_CAST(F4211.SDUPRC AS FLOAT), 0) AS unitPrice,
      (COALESCE(TRY_CAST(F4211.SDUORG AS FLOAT), 0) * COALESCE(TRY_CAST(F4211.SDUPRC AS FLOAT), 0)) AS totalAmount,
      CASE 
        WHEN F4211.SDDRQJ IS NOT NULL AND F4211.SDDRQJ > 0 THEN 
          CONVERT(VARCHAR, CAST(F4211.SDDRQJ AS INT))
        ELSE ''
      END AS requestedShipDate,
      RTRIM(ISNULL(F4211.SDNXTR, '')) AS status,
      RTRIM(ISNULL(F4211.SDPRIO, '')) AS priority
    FROM dbo.F4211 F4211
    INNER JOIN dbo.F4201 F4201 ON F4211.SDDOCO = F4201.SHDOCO AND F4211.SDDCTO = F4201.SHDCTO
    LEFT JOIN dbo.F0101 F0101 ON F4201.SHAN8 = F0101.ABAN8
    WHERE RTRIM(CONVERT(VARCHAR, F4211.SDDOCO)) = '${soNumber}'
    ORDER BY F4211.SDDOCO DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      soNumber: row.soNumber || "",
      customerName: row.customerName || "Unknown Customer",
      itemNumber: row.itemNumber || "",
      secondItemNumber: row.secondItemNumber || "",
      thirdItemNumber: row.thirdItemNumber || "",
      quantity: Number(row.quantity) || 0,
      unitPrice: Number(row.unitPrice) || 0,
      totalAmount: Number(row.totalAmount) || 0,
      requestedShipDate: convertJEDate(row.requestedShipDate),
      status: mapJDESOStatus(row.status),
      priority: mapJDESOPriority(row.priority),
      fulfillmentRisk: calculateJDESORisk(row.status, row.requestedShipDate),
    };
  } catch (error) {
    console.error("[JDE Database] Error fetching sales order:", error);
    return null;
  }
}

// ============ JDE INVENTORY INTERFACE ============
export interface JDEInventoryItem {
  itemCode: string;
  description: string;
  category: string;
  quantityAvailable: number;
  daysOfSupply: number;
  reorderPoint: number;
  stockoutRisk: string;
}

export async function getJDEInventoryItems(): Promise<JDEInventoryItem[]> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return [];
  }

  const query = `
    SELECT DISTINCT
      RTRIM(F4101.IMLITM) AS itemCode,
      RTRIM(ISNULL(F4101.IMDSC1, '')) AS description,
      RTRIM(ISNULL(F4101.IMSRP1, '')) AS category,
      ISNULL(F41021.LIPQOH, 0) AS quantityAvailable,
      ISNULL(F4102.IBROPI, 0) AS reorderPoint,
      (
        SELECT TOP 1 F4111_2.ILTRQT
        FROM dbo.F4111 F4111_2
        WHERE F4111_2.ILITM = F4101.IMITM
        ORDER BY F4111_2.ILTRDJ DESC
      ) AS transactionQuantity
    FROM dbo.F4101 F4101
    LEFT JOIN dbo.F41021 F41021 
      ON F4101.IMITM = F41021.LIITM
    LEFT JOIN dbo.F4102 F4102 
      ON F4101.IMITM = F4102.IBITM
    WHERE F4101.IMITM IS NOT NULL
    ORDER BY itemCode
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    return rows.map((row: any) => {
      const quantityAvailable = Number(row.quantityAvailable) || 0;
      const transactionQuantity = Number(row.transactionQuantity) || 0;
      
      let daysOfSupply = 0;
      if (transactionQuantity > 0) {
        daysOfSupply = Math.round(quantityAvailable / transactionQuantity);
      } else if (quantityAvailable > 0) {
        daysOfSupply = 30;
      }
      
      const reorderPoint = Number(row.reorderPoint) || 0;
      let stockoutRisk = "low";
      
      if (quantityAvailable === 0) {
        stockoutRisk = "critical";
      } else if (reorderPoint > 0) {
        const ratio = quantityAvailable / reorderPoint;
        if (ratio <= 0.5) {
          stockoutRisk = "critical";
        } else if (ratio <= 1.0) {
          stockoutRisk = "high";
        } else if (ratio <= 1.5) {
          stockoutRisk = "medium";
        } else {
          stockoutRisk = "low";
        }
      } else if (daysOfSupply <= 7) {
        stockoutRisk = "critical";
      } else if (daysOfSupply <= 14) {
        stockoutRisk = "high";
      } else if (daysOfSupply <= 30) {
        stockoutRisk = "medium";
      }
      
      return {
        itemCode: row.itemCode || "",
        description: row.description || "",
        category: row.category || "Uncategorized",
        quantityAvailable,
        daysOfSupply,
        reorderPoint,
        stockoutRisk,
      };
    });
  } catch (error) {
    console.error("[JDE Database] Error fetching inventory items:", error);
    return [];
  }
}

export async function getJDEInventoryItemByCode(itemCode: string): Promise<JDEInventoryItem | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  const query = `
    SELECT TOP 1
      RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) AS itemCode,
      RTRIM(ISNULL(F4101.IMDSC1, '')) AS description,
      RTRIM(ISNULL(F4101.IMSRP1, '')) AS category,
      RTRIM(CONVERT(VARCHAR, ISNULL(F41021.LIPQOH, '0'))) AS quantityAvailable,
      RTRIM(CONVERT(VARCHAR, ISNULL(F4102.IBROPI, '0'))) AS reorderPoint,
      (
        SELECT TOP 1 RTRIM(CONVERT(VARCHAR, ISNULL(F4111.ILTRQT, '0')))
        FROM dbo.F4111 F4111
        WHERE RTRIM(CONVERT(VARCHAR, F4111.ILITM)) = RTRIM(CONVERT(VARCHAR, F4101.IMLITM))
        ORDER BY F4111.ILTRDJ DESC
      ) AS transactionQuantity
    FROM dbo.F4101 F4101
    LEFT JOIN dbo.F41021 F41021 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F41021.LIITM))
    LEFT JOIN dbo.F4102 F4102 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F4102.IBITM))
    WHERE RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = '${itemCode}'
    ORDER BY RTRIM(CONVERT(VARCHAR, F4101.IMLITM))
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const quantityAvailable = Number(row.quantityAvailable) || 0;
    const transactionQuantity = Number(row.transactionQuantity) || 0;
    
    let daysOfSupply = 0;
    if (transactionQuantity > 0) {
      daysOfSupply = Math.round(quantityAvailable / transactionQuantity);
    } else if (quantityAvailable > 0) {
      daysOfSupply = 30;
    }
    
    const reorderPoint = Number(row.reorderPoint) || 0;
    let stockoutRisk = "low";
    
    if (quantityAvailable === 0) {
      stockoutRisk = "critical";
    } else if (reorderPoint > 0) {
      const ratio = quantityAvailable / reorderPoint;
      if (ratio <= 0.5) {
        stockoutRisk = "critical";
      } else if (ratio <= 1.0) {
        stockoutRisk = "high";
      } else if (ratio <= 1.5) {
        stockoutRisk = "medium";
      }
    } else if (daysOfSupply <= 7) {
      stockoutRisk = "critical";
    } else if (daysOfSupply <= 14) {
      stockoutRisk = "high";
    } else if (daysOfSupply <= 30) {
      stockoutRisk = "medium";
    }
    
    return {
      itemCode: row.itemCode || "",
      description: row.description || "",
      category: row.category || "Uncategorized",
      quantityAvailable,
      daysOfSupply,
      reorderPoint,
      stockoutRisk,
    };
  } catch (error) {
    console.error("[JDE Database] Error fetching inventory item:", error);
    return null;
  }
}

// ============ JDE SHIPMENT INTERFACE ============
export interface JDEShipment {
  shipmentNumber: string;
  carrier: string;
  originCity: string;
  originCountry: string;
  destination: string;
  eta: string;
  status: string;
  riskLevel: string;
  temperature?: number;
}

export async function getJDEShipments(): Promise<JDEShipment[]> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return [];
  }

  const query = `
    SELECT
      RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) AS shipmentNumber,
      RTRIM(ISNULL(F0101Dest.ABALPH, '')) AS destination,
      CASE 
        WHEN F4211.SDPDDJ IS NOT NULL AND TRY_CAST(F4211.SDPDDJ AS FLOAT) > 0 THEN 
          CONVERT(VARCHAR, CAST(F4211.SDPDDJ AS INT))
        ELSE ''
      END AS eta,
      RTRIM(ISNULL(F4211.SDNXTR, '')) AS status,
      RTRIM(ISNULL(F0116.ALCTY1, '')) AS originCity,
      RTRIM(ISNULL(F0116.ALCTR, '')) AS originCountry
    FROM dbo.F4215 F4215
    LEFT JOIN dbo.F4211 F4211 ON RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = RTRIM(CONVERT(VARCHAR, F4211.SDDOCO))
    LEFT JOIN dbo.F0116 F0116 ON F4215.XHAN8 = F0116.ALAN8
    LEFT JOIN dbo.F0101 F0101Dest ON F4211.SDSHAN = F0101Dest.ABAN8
    ORDER BY F4215.XHSHPN DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    return rows.map((row: any) => ({
      shipmentNumber: row.shipmentNumber || "",
      carrier: "TBD",
      originCity: row.originCity || "",
      originCountry: row.originCountry || "",
      destination: row.destination || "",
      eta: convertJEDate(row.eta),
      status: mapJDEShipmentStatus(row.status),
      riskLevel: calculateShipmentRisk(row.status, row.eta),
    }));
  } catch (error) {
    console.error("[JDE Database] Error fetching shipments:", error);
    return [];
  }
}

function mapJDEShipmentStatus(nxtStatus: string): string {
  const statusMap: Record<string, string> = {
    "420": "Pending",
    "430": "Picked Up",
    "440": "In Transit",
    "450": "Arrived",
    "460": "Out for Delivery",
    "470": "Delivered",
    "480": "Completed",
    "999": "Cancelled",
    "": "Pending",
  };
  
  const trimmed = nxtStatus?.trim() || "";
  return statusMap[trimmed] || trimmed || "Pending";
}

function calculateShipmentRisk(status: string, eta: string): string {
  if (status === "470" || status === "480") {
    return "green";
  }
  
  if (status === "999") {
    return "green";
  }
  
  if (eta) {
    try {
      const dateStr = eta.toString();
      let year: number, month: number, day: number;
      
      if (dateStr.length === 7) {
        const century = parseInt(dateStr.charAt(0));
        year = century === 0 ? 2000 + parseInt(dateStr.substring(1, 3)) : 1900 + parseInt(dateStr.substring(1, 3));
        month = parseInt(dateStr.substring(3, 5)) - 1;
        day = parseInt(dateStr.substring(5, 7));
      } else if (dateStr.length === 8) {
        year = parseInt(dateStr.substring(0, 4));
        month = parseInt(dateStr.substring(4, 6)) - 1;
        day = parseInt(dateStr.substring(6, 8));
      } else {
        return "yellow";
      }
      
      const etaDateObj = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysUntilArrival = Math.ceil((etaDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilArrival < 0) {
        return "red";
      } else if (daysUntilArrival <= 2) {
        return "red";
      } else if (daysUntilArrival <= 5) {
        return "yellow";
      }
    } catch (e) {
      console.warn("[JDE Database] Error parsing ETA date:", e);
    }
  }
  
  return "green";
}

export async function getJDEShipmentById(shipmentNumber: string): Promise<JDEShipment | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  const query = `
    SELECT TOP 1
      RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) AS shipmentNumber,
      RTRIM(ISNULL(F0101Dest.ABALPH, '')) AS destination,
      CASE 
        WHEN F4211.SDPDDJ IS NOT NULL AND TRY_CAST(F4211.SDPDDJ AS FLOAT) > 0 THEN 
          CONVERT(VARCHAR, CAST(F4211.SDPDDJ AS INT))
        ELSE ''
      END AS eta,
      RTRIM(ISNULL(F4211.SDNXTR, '')) AS status,
      RTRIM(ISNULL(F0116.ALCTY1, '')) AS originCity,
      RTRIM(ISNULL(F0116.ALCTR, '')) AS originCountry
    FROM dbo.F4215 F4215
    LEFT JOIN dbo.F4211 F4211 ON RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = RTRIM(CONVERT(VARCHAR, F4211.SDDOCO))
    LEFT JOIN dbo.F0116 F0116 ON F4215.XHAN8 = F0116.ALAN8
    LEFT JOIN dbo.F0101 F0101Dest ON F4211.SDSHAN = F0101Dest.ABAN8
    WHERE RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = '${shipmentNumber}'
    ORDER BY F4215.XHSHPN DESC
  `;

  try {
    const rows = await executeQuery<any>(query);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      shipmentNumber: row.shipmentNumber || "",
      carrier: "TBD",
      originCity: row.originCity || "",
      originCountry: row.originCountry || "",
      destination: row.destination || "",
      eta: convertJEDate(row.eta),
      status: mapJDEShipmentStatus(row.status),
      riskLevel: calculateShipmentRisk(row.status, row.eta),
    };
  } catch (error) {
    console.error("[JDE Database] Error fetching shipment:", error);
    return null;
  }
}

// ============ JDE SUPPLIERS INTERFACE ============
export interface JDESupplier {
  id: string;
  name: string;
  type: string;
  country: string;
  leadDays: number;
  reliabilityScore?: number;
  qualityScore?: number;
}

export async function getJDESuppliers(): Promise<JDESupplier[]> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return [];
  }

  const suppliersQuery = `
    SELECT
      RTRIM(CONVERT(VARCHAR, F0101.ABAN8)) AS id,
      RTRIM(ISNULL(F0101.ABALPH, '')) AS name,
      RTRIM(ISNULL(F0101.ABAT1, '')) AS type,
      RTRIM(ISNULL(F0116.ALCTR, '')) AS country,
      COALESCE(TRY_CAST(F4311.PDPDDJ AS INT), 0) - COALESCE(TRY_CAST(F4311.PDTRDJ AS INT), 0) AS leadDays
    FROM dbo.F0101 F0101
    LEFT JOIN dbo.F0116 F0116 ON F0101.ABAN8 = F0116.ALAN8
    LEFT JOIN dbo.F4311 F4311 ON F0101.ABAN8 = F4311.PDAN8
    WHERE F0101.ABAT1 = 'VEND'
      AND F0101.ABAN8 IS NOT NULL
      AND F0101.ABALPH IS NOT NULL
      AND RTRIM(F0101.ABALPH) <> ''
    GROUP BY F0101.ABAN8, F0101.ABALPH, F0101.ABAT1, F0116.ALCTR, F4311.PDPDDJ, F4311.PDTRDJ
    ORDER BY F0101.ABALPH ASC
  `;

  const reliabilityQuery = `
    SELECT 
      F4311.PDAN8 AS supplierId,
      COUNT(*) AS totalReceipts,
      SUM(CASE 
        WHEN F43121.PRRCDJ IS NOT NULL AND F43121.PRRCDJ > 0 
             AND F4311.PDDRQJ IS NOT NULL AND F4311.PDDRQJ > 0
             AND F43121.PRRCDJ <= F4311.PDDRQJ 
        THEN 1 ELSE 0 END) AS reliableReceipts
    FROM dbo.F4311 F4311
    INNER JOIN dbo.F43121 F43121 ON F4311.PDDOCO = F43121.PRDOCO 
      AND F4311.PDDCTO = F43121.PRDCTO 
      AND F4311.PDLNID = F43121.PRLNID
    WHERE F43121.PRRCDJ IS NOT NULL AND F43121.PRRCDJ > 0
    GROUP BY F4311.PDAN8
  `;

  const qualityQuery = `
    SELECT 
      F4311.PDAN8 AS supplierId,
      SUM(COALESCE(TRY_CAST(F4311.PDUORG AS FLOAT), 0)) AS totalOrdered,
      SUM(COALESCE(TRY_CAST(F4311.PDUORG AS FLOAT), 0) - COALESCE(TRY_CAST(F4311.PDUOPN AS FLOAT), 0)) AS totalReceived
    FROM dbo.F4311 F4311
    WHERE F4311.PDUORG IS NOT NULL AND F4311.PDUORG > 0
    GROUP BY F4311.PDAN8
  `;

  try {
    const [supplierRows, reliabilityRows, qualityRows] = await Promise.all([
      executeQuery<any>(suppliersQuery),
      executeQuery<any>(reliabilityQuery),
      executeQuery<any>(qualityQuery),
    ]);

    const reliabilityMap = new Map<string, { total: number; reliable: number }>();
    for (const row of reliabilityRows) {
      reliabilityMap.set(String(row.supplierId), {
        total: Number(row.totalReceipts) || 0,
        reliable: Number(row.reliableReceipts) || 0,
      });
    }

    const qualityMap = new Map<string, { ordered: number; received: number }>();
    for (const row of qualityRows) {
      qualityMap.set(String(row.supplierId), {
        ordered: Number(row.totalOrdered) || 0,
        received: Number(row.totalReceived) || 0,
      });
    }

    const supplierMap = new Map<string, JDESupplier>();
    
    for (const row of supplierRows) {
      const supplierId = row.id;
      if (!supplierMap.has(supplierId)) {
        const relData = reliabilityMap.get(supplierId);
        let reliabilityScore: number | undefined;
        
        if (relData && relData.total > 0) {
          reliabilityScore = Math.round((relData.reliable / relData.total) * 1000) / 10;
        }

        const qualData = qualityMap.get(supplierId);
        let qualityScore: number | undefined;
        
        if (qualData && qualData.ordered > 0) {
          qualityScore = Math.round((qualData.received / qualData.ordered) * 1000) / 10;
        }
        
        supplierMap.set(supplierId, {
          id: supplierId,
          name: row.name || "",
          type: row.type || "",
          country: row.country || "",
          leadDays: Number(row.leadDays) || 0,
          reliabilityScore,
          qualityScore,
        });
      }
    }
    
    return Array.from(supplierMap.values());
  } catch (error) {
    console.error("[JDE Database] Error fetching suppliers:", error);
    return [];
  }
}

export async function getJDEDelayedPurchaseOrders(): Promise<JDEPurchaseOrder[]> {
  const allOrders = await getJDEPurchaseOrders();
  return allOrders.filter(po => po.riskLevel === "red");
}

export async function getJDEAtRiskShipments(): Promise<JDEShipment[]> {
  const allShipments = await getJDEShipments();
  return allShipments.filter(shipment => shipment.riskLevel === "red" || shipment.riskLevel === "yellow");
}

export async function createAlertResolutionsTable(): Promise<void> {
  const query = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='alert_resolutions' AND xtype='U')
    CREATE TABLE [dbo].[alert_resolutions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [alert_id] INT NOT NULL,
        [user_id] INT NOT NULL,
        [action_taken] NVARCHAR(MAX),
        [resolved_at] DATETIME2 DEFAULT GETDATE(),
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_alert_resolutions_alert_id')
    CREATE INDEX IX_alert_resolutions_alert_id ON [dbo].[alert_resolutions] ([alert_id]);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_alert_resolutions_user_id')
    CREATE INDEX IX_alert_resolutions_user_id ON [dbo].[alert_resolutions] ([user_id]);
  `;

  try {
    await executeQuery(query);
    console.log("[JDE Database] Alert resolutions table created/verified");
  } catch (error) {
    console.error("[JDE Database] Error creating alert resolutions table:", error);
    throw error;
  }
}

export async function resolveAlert(alertId: number, userId: number, actionTaken: string): Promise<void> {
  const query = `
    MERGE [dbo].[alert_resolutions] AS target
    USING (SELECT @alertId as alert_id, @userId as user_id, @actionTaken as action_taken) AS source
    ON target.alert_id = source.alert_id AND target.user_id = source.user_id
    WHEN MATCHED THEN
        UPDATE SET 
            action_taken = source.action_taken,
            resolved_at = GETDATE(),
            updated_at = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (alert_id, user_id, action_taken, resolved_at, created_at, updated_at)
        VALUES (source.alert_id, source.user_id, source.action_taken, GETDATE(), GETDATE(), GETDATE());
  `;

  try {
    const pool = await getPool();
    if (!pool) {
      throw new Error("Database not available");
    }

    const request = pool.request();
    request.input('alertId', sql.Int, alertId);
    request.input('userId', sql.Int, userId);
    request.input('actionTaken', sql.NVarChar, actionTaken);

    await request.query(query);
    console.log(`[JDE Database] Alert ${alertId} resolved by user ${userId}`);
  } catch (error) {
    console.error("[JDE Database] Error resolving alert:", error);
    throw error;
  }
}

export async function getResolvedAlerts(userId: number): Promise<number[]> {
  const query = `
    SELECT alert_id
    FROM [dbo].[alert_resolutions]
    WHERE user_id = @userId
  `;

  try {
    const pool = await getPool();
    if (!pool) {
      return [];
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);

    const result = await request.query(query);
    return result.recordset.map((row: any) => row.alert_id);
  } catch (error) {
    console.error("[JDE Database] Error getting resolved alerts:", error);
    return [];
  }
}

export { sql };

