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
    MSSQL_DATABASE: ENV.mssqlDatabase || "CRPDTA",
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
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 60000,
    },
  };
}

/**
 * Convert JDE Julian date (CYYDDD) to YYYY-MM-DD format
 * C = Century (0 = 1900s, 1 = 2000s)
 * YY = Year within the century
 * DDD = Day of the year (001–365)
 * 
 * Example: 124065 -> C=1, YY=24, DDD=065
 * Year = (1 × 100) + 1900 + 24 = 2024
 * Final Date = 2024-01-01 + 64 days = 2024-03-05
 */
function convertJDEJulianDate(julianDate: string | number | null | undefined): string {
  if (!julianDate) return "";
  
  const dateStr = String(julianDate).trim();
  if (!dateStr || dateStr === "0") return "";
  
  try {
    // If already looks like YYYY-MM-DD, return as-is
    if (dateStr.includes("-") && dateStr.length === 10) {
      return dateStr;
    }
    
    // Handle CYYDDD format (6 digits)
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
    
    // Legacy handling for other formats (CYYMMDD, YYYYMMDD, etc.)
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
    
    const checkYear = dateObj.getFullYear();
    const checkMonth = dateObj.getMonth();
    const checkDay = dateObj.getDate();
    if (checkYear !== year || checkMonth !== month || checkDay !== day) {
      console.warn("[JDE Database] Date validation failed:", dateStr, "->", checkYear, checkMonth, checkDay);
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

export async function getJDEDb(): Promise<sql.ConnectionPool | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  try {
    const pool = await sql.connect(getSqlConfig());
    return pool;
  } catch (error) {
    console.error("[JDE Database] Failed to connect:", error);
    return null;
  }
}

async function executeQuery<T>(query: string): Promise<T[]> {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await getJDEDb();
    if (!pool) {
      console.warn("[JDE Database] Cannot execute query: database not available");
      return [];
    }

    const request = pool.request();
    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error("[JDE Database] Query error:\n", query, "\n", error);
    return [];
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.warn("[JDE Database] Error closing pool:", closeError);
      }
    }
  }
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
    FROM CRPDTA.F4301 F4301
    INNER JOIN CRPDTA.F4311 F4311 ON F4301.PHDOCO = F4311.PDDOCO AND F4301.PHDCTO = F4311.PDDCTO
    LEFT JOIN CRPDTA.F0101 F0101 ON F4311.PDAN8 = F0101.ABAN8
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
    "420": "Pending",
    "430": "Approved",
    "440": "Sent to Supplier",
    "450": "Partial Receipt",
    "460": "Receipt Complete",
    "470": "Closed",
    "480": "Cancelled",
    "999": "Cancelled",
    "": "Pending",
  };
  
  const trimmed = nxtStatus?.trim() || "";
  return statusMap[trimmed] || trimmed || "Unknown";
}

function calculateJDEPORisk(status: string, deliveryDate: string): { riskLevel: string; delayProbability: number } {
  // If already delivered or closed, low risk
  if (status === "460" || status === "470" || status === "480" || status === "Closed" || status === "Receipt Complete" || status === "Closed" || status === "Cancelled") {
    return { riskLevel: "green", delayProbability: 5 };
  }
  
  if (status === "999" || status === "Cancelled") {
    return { riskLevel: "green", delayProbability: 5 };
  }
  
  // Calculate based on delivery date
  if (deliveryDate) {
    try {
      let year: number, month: number, day: number;
      const dateStr = deliveryDate.toString();
      
      if (dateStr.length === 6) {
        // CYYDDD format
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
        // Past due date
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

  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await getJDEDb();
    if (!pool) {
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
      FROM CRPDTA.F4301 F4301
      INNER JOIN CRPDTA.F4311 F4311 ON F4301.PHDOCO = F4311.PDDOCO AND F4301.PHDCTO = F4311.PDDCTO
      LEFT JOIN CRPDTA.F0101 F0101 ON F4311.PDAN8 = F0101.ABAN8
      WHERE RTRIM(CONVERT(VARCHAR, F4301.PHDOCO)) = '${poNumber}'
      ORDER BY F4301.PHDOCO DESC
    `;

    const request = pool.request();
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
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
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.warn("[JDE Database] Error closing pool:", closeError);
      }
    }
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
    FROM CRPDTA.F4211 F4211
    INNER JOIN CRPDTA.F4201 F4201 ON F4211.SDDOCO = F4201.SHDOCO AND F4211.SDDCTO = F4201.SHDCTO
    LEFT JOIN CRPDTA.F0101 F0101 ON F4201.SHAN8 = F0101.ABAN8
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
  const statusMap: Record<string, string> = {
    "420": "Pending",
    "430": "Confirmed",
    "440": "Processing",
    "450": "Picked",
    "460": "Packed",
    "470": "Shipped",
    "480": "Delivered",
    "490": "Closed",
    "999": "Cancelled",
    "": "Pending",
  };
  
  const trimmed = nxtStatus?.trim() || "";
  return statusMap[trimmed] || trimmed || "Pending";
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
  if (status === "470" || status === "480" || status === "490") {
    return "green";
  }
  
  if (status === "999") {
    return "green";
  }
  
  if (shipDate) {
    try {
      const dateStr = shipDate.toString();
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
  
  return "green";
}

export async function getJDESalesOrderById(soNumber: string): Promise<JDESalesOrder | null> {
  const config = getJDEConfig();
  
  if (!config.MSSQL_USER || !config.MSSQL_PASSWORD || !config.MSSQL_HOST) {
    console.warn("[JDE Database] MSSQL credentials not configured");
    return null;
  }

  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await getJDEDb();
    if (!pool) {
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
      FROM CRPDTA.F4211 F4211
      INNER JOIN CRPDTA.F4201 F4201 ON F4211.SDDOCO = F4201.SHDOCO AND F4211.SDDCTO = F4201.SHDCTO
      LEFT JOIN CRPDTA.F0101 F0101 ON F4201.SHAN8 = F0101.ABAN8
      WHERE RTRIM(CONVERT(VARCHAR, F4211.SDDOCO)) = '${soNumber}'
      ORDER BY F4211.SDDOCO DESC
    `;

    const request = pool.request();
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
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
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.warn("[JDE Database] Error closing pool:", closeError);
      }
    }
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
    SELECT
      RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) AS itemCode,
      RTRIM(ISNULL(F4101.IMDSC1, '')) AS description,
      RTRIM(ISNULL(F4101.IMSRP1, '')) AS category,
      RTRIM(CONVERT(VARCHAR, ISNULL(F41021.LIPQOH, '0'))) AS quantityAvailable,
      RTRIM(CONVERT(VARCHAR, ISNULL(F4102.IBROPI, '0'))) AS reorderPoint,
      (
        SELECT TOP 1 RTRIM(CONVERT(VARCHAR, ISNULL(F4111.ILTRQT, '0')))
        FROM CRPDTA.F4111 F4111
        WHERE RTRIM(CONVERT(VARCHAR, F4111.ILITM)) = RTRIM(CONVERT(VARCHAR, F4101.IMLITM))
        ORDER BY F4111.ILTRDJ DESC
      ) AS transactionQuantity
    FROM CRPDTA.F4101 F4101
    LEFT JOIN CRPDTA.F41021 F41021 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F41021.LIITM))
    LEFT JOIN CRPDTA.F4102 F4102 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F4102.IBITM))
    ORDER BY F4101.IMLITM
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

  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await getJDEDb();
    if (!pool) {
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
          FROM CRPDTA.F4111 F4111
          WHERE RTRIM(CONVERT(VARCHAR, F4111.ILITM)) = RTRIM(CONVERT(VARCHAR, F4101.IMLITM))
          ORDER BY F4111.ILTRDJ DESC
        ) AS transactionQuantity
      FROM CRPDTA.F4101 F4101
      LEFT JOIN CRPDTA.F41021 F41021 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F41021.LIITM))
      LEFT JOIN CRPDTA.F4102 F4102 ON RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = RTRIM(CONVERT(VARCHAR, F4102.IBITM))
      WHERE RTRIM(CONVERT(VARCHAR, F4101.IMLITM)) = '${itemCode}'
      ORDER BY RTRIM(CONVERT(VARCHAR, F4101.IMLITM))
    `;

    const request = pool.request();
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
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
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.warn("[JDE Database] Error closing pool:", closeError);
      }
    }
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
    FROM CRPDTA.F4215 F4215
    LEFT JOIN CRPDTA.F4211 F4211 ON RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = RTRIM(CONVERT(VARCHAR, F4211.SDDOCO))
    LEFT JOIN CRPDTA.F0116 F0116 ON F4215.XHAN8 = F0116.ALAN8
    LEFT JOIN CRPDTA.F0101 F0101Dest ON F4211.SDSHAN = F0101Dest.ABAN8
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

  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await getJDEDb();
    if (!pool) {
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
      FROM CRPDTA.F4215 F4215
      LEFT JOIN CRPDTA.F4211 F4211 ON RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = RTRIM(CONVERT(VARCHAR, F4211.SDDOCO))
      LEFT JOIN CRPDTA.F0116 F0116 ON F4215.XHAN8 = F0116.ALAN8
      LEFT JOIN CRPDTA.F0101 F0101Dest ON F4211.SDSHAN = F0101Dest.ABAN8
      WHERE RTRIM(CONVERT(VARCHAR, F4215.XHSHPN)) = '${shipmentNumber}'
      ORDER BY F4215.XHSHPN DESC
    `;

    const request = pool.request();
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
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
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.warn("[JDE Database] Error closing pool:", closeError);
      }
    }
  }
}

// Export MSSQL for type references
export { sql };

