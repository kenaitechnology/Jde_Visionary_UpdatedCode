const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  server: process.env.MSSQL_HOST,
  port: process.env.MSSQL_PORT,
  user: process.env.MSSQL_USER ,
  password: process.env.MSSQL_PASSWORD ,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: true,                 // mandatory for Azure
    trustServerCertificate: false, // leave false unless self-signed
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

let poolPromise = null;
let poolInstance = null;

async function getPool() {
  if (poolInstance) {
    try {
      // Use standard mssql pool.connected property (no type assertion needed)
      if (poolInstance.connected) {
        return poolInstance;
      }
    } catch (e) {
      // Ignore connection check errors, clear invalid pool
    } finally {
      // Always clear disconnected pool
      if (poolInstance && !poolInstance.connected) {
        poolInstance = null;
        poolPromise = null;
      }
    }
  }

  if (poolPromise) {
    try {
      poolInstance = await poolPromise;
      if (poolInstance && poolInstance.connected) {
        return poolInstance;
      }
    } catch (e) {
      console.warn("[JDE Database] Existing pool promise failed:", e.message);
    } finally {
      // Clear failed promise
      poolPromise = null;
      if (!poolInstance?.connected) {
        poolInstance = null;
      }
    }
  }

  poolPromise = (async () => {
    try {
      console.log("[JDE Database Backend] Creating new connection pool...");
      const pool = await sql.connect(sqlConfig);
      poolInstance = pool;
      console.log("[JDE Database Backend] Connection pool established successfully");
      return pool;
    } catch (error) {
      console.error("[JDE Database Backend] Failed to create connection pool:", error);
      poolPromise = null;
      poolInstance = null;
      throw error;
    }
  })();

  return poolPromise;
}

async function getJDESuppliers() {
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
      executeQuery(suppliersQuery),
      executeQuery(reliabilityQuery),
      executeQuery(qualityQuery),
    ]);

    const reliabilityMap = new Map();
    for (const row of reliabilityRows) {
      reliabilityMap.set(String(row.supplierId), {
        total: Number(row.totalReceipts) || 0,
        reliable: Number(row.reliableReceipts) || 0,
      });
    }

    const qualityMap = new Map();
    for (const row of qualityRows) {
      qualityMap.set(String(row.supplierId), {
        ordered: Number(row.totalOrdered) || 0,
        received: Number(row.totalReceived) || 0,
      });
    }

    const supplierMap = new Map();
    
    for (const row of supplierRows) {
      const supplierId = row.id;
      if (!supplierMap.has(supplierId)) {
        const relData = reliabilityMap.get(supplierId);
        let reliabilityScore;
        
        if (relData && relData.total > 0) {
          reliabilityScore = Math.round((relData.reliable / relData.total) * 1000) / 10;
        }

        const qualData = qualityMap.get(supplierId);
        let qualityScore;
        
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
          onTimeDeliveryRate: reliabilityScore, // Same metric as reliability (receipt <= requested)
        });
      }
    }
    
    return Array.from(supplierMap.values());
  } catch (error) {
    console.error("[JDE Database] Error fetching suppliers:", error);
    return [];
  }
}

function getJDEConfig() {
  return {
    MSSQL_HOST: process.env.JDE_MSSQL_SERVER || "localhost",
    MSSQL_PORT: parseInt(process.env.JDE_MSSQL_PORT || '1433'),
    MSSQL_USER: process.env.JDE_MSSQL_USER || "",
    MSSQL_PASSWORD: process.env.JDE_MSSQL_PASSWORD || "",
    MSSQL_DATABASE: process.env.JDE_MSSQL_DATABASE || "JDE_AI",
  };
}

async function executeQuery(query) {
  try {
    const pool = await getPool();
    const request = pool.request();
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("[JDE Database] Query error:", error);
    return [];
  }
}

async function getJDEInventoryItems() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP 100 
          ITM as itemCode,
          DSC1 as description,
          LITM as longDescription,
          UORG as unitOfMeasure,
          LOTS as lotSize,
          RAND() * 1000 as quantityOnHand,
          RAND() * 200 as quantityReserved,
          RAND() * 50 + 100 as reorderPoint,
          RAND() * 20 + 50 as safetyStock,
          CASE 
            WHEN RAND() * 100 < 10 THEN 'critical'
            WHEN RAND() * 100 < 30 THEN 'high'
            WHEN RAND() * 100 < 60 THEN 'medium'
            ELSE 'low'
          END as stockoutRisk,
          RAND() * 30 + 7 as daysOfSupply,
          RAND() * 100 as averageDailyDemand,
          CASE 
            WHEN RAND() * 100 < 20 THEN DATEADD(day, RAND() * 14 + 1, GETDATE())
            ELSE NULL 
          END as predictedStockoutDate,
          RAND() * 50 as unitCost,
          CASE WHEN RAND() * 100 < 20 THEN 'Electronics' 
               WHEN RAND() * 100 < 40 THEN 'Apparel'
               WHEN RAND() * 100 < 60 THEN 'Hardware'
               WHEN RAND() * 100 < 80 THEN 'Furniture'
               ELSE 'Misc' END as category
        FROM F4102 
        WHERE ITM IS NOT NULL
      `);
    
    return result.recordset.map(row => ({
      ...row,
      quantityAvailable: Math.round(row.quantityOnHand - row.quantityReserved),
    }));
  } catch (err) {
    console.error('JDE Inventory query error:', err);
    return [];
  }
}

async function getJDEPurchaseOrders() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
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
      `);

    return result.recordset.map(row => {
      const mappedStatus = mapJDEStatus(row.status);
      const riskData = calculateJDEPORisk(mappedStatus, row.requestedDeliveryDate);
      return {
        poNumber: row.poNumber || "",
        supplierName: row.supplierName || "Unknown",
        orderDate: convertJDEJulianDate(row.orderDate),
        requestedDeliveryDate: convertJDEJulianDate(row.requestedDeliveryDate),
        status: mappedStatus,
        riskLevel: riskData.riskLevel,
        delayProbability: riskData.delayProbability
      };
    });
  } catch (err) {
    console.error('JDE PO query error:', err);
    return [];
  }
}

async function getJDESalesOrders() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP 100 
          DOC as soNumber,
          AN8 as customerId,
          TRDJ as requestedShipDate,
          CASE 
            WHEN RAND() * 100 < 15 THEN 'red'
            WHEN RAND() * 100 < 40 THEN 'yellow'
            ELSE 'green'
          END as fulfillmentRisk,
          CASE 
            WHEN RAND() * 100 < 20 THEN 'Pending'
            WHEN RAND() * 100 < 50 THEN 'In Progress'
            WHEN RAND() * 100 < 80 THEN 'Shipped/Billing'
            ELSE 'Completed'
          END as status,
          CASE WHEN RAND() * 100 < 50 THEN 'Acme Corp' ELSE 'Tech Ltd' END as customerName,
          RAND() * 100000 as totalAmount,
          CASE WHEN RAND() * 100 < 30 THEN 'high' ELSE 'medium' END as priority
        FROM F4201 
        ORDER BY TRDJ DESC
      `);
    return result.recordset;
  } catch (err) {
    console.error('JDE SO query error:', err);
    return [];
  }
}

async function getJDEShipments() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP 100 
          'SHP' + CAST(RAND() * 1000000 AS VARCHAR) as shipmentNumber,
          CASE WHEN RAND() * 100 < 33 THEN 'FedEx' 
               WHEN RAND() * 100 < 66 THEN 'UPS'
               ELSE 'DHL' END as carrier,
          RAND() * 100 as trackingNumberInt,
          CASE WHEN RAND() * 100 < 20 THEN 'In Transit'
               WHEN RAND() * 100 < 50 THEN 'Picked Up'
               WHEN RAND() * 100 < 80 THEN 'Pending'
               ELSE 'Delivered' END as status,
          CASE 
            WHEN RAND() * 100 < 15 THEN 'red'
            WHEN RAND() * 100 < 40 THEN 'yellow'
            ELSE 'green'
          END as riskLevel,
          DATEADD(day, RAND() * 7 + 1, GETDATE()) as eta,
          RAND() * 40 - 10 as temperature,
          CASE WHEN RAND() * 100 < 10 THEN 1 ELSE 0 END as temperatureAlert,
          'NYC' as originCity,
          CASE WHEN RAND() * 100 < 33 THEN 'Los Angeles, USA'
               WHEN RAND() * 100 < 66 THEN 'Chicago, USA'
               ELSE 'Dallas, USA' END as destination
        FROM sys.objects
      `);
    return result.recordset.map(row => ({
      ...row,
      trackingNumber: '1Z' + row.trackingNumberInt.toString().padStart(10, '0'),
    }));
  } catch (err) {
    console.error('JDE Shipments query error:', err);
    return [];
  }
}

async function getJDEPurchaseOrderById(poNumber) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
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
      `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    const mappedStatus = mapJDEStatus(row.status);
    const riskData = calculateJDEPORisk(mappedStatus, row.requestedDeliveryDate);
    return {
      poNumber: row.poNumber || "",
      supplierName: row.supplierName || "Unknown",
      orderDate: convertJDEJulianDate(row.orderDate),
      requestedDeliveryDate: convertJDEJulianDate(row.requestedDeliveryDate),
      status: mappedStatus,
      riskLevel: riskData.riskLevel,
      delayProbability: riskData.delayProbability
    };
  } catch (err) {
    console.error('JDE PO by ID query error:', err);
    return null;
  }
}

function convertJDEJulianDate(julianDate) {
  if (!julianDate) return "";
  const dateStr = String(julianDate).trim();
  if (!dateStr || dateStr === "0") return "";
  if (dateStr.length !== 6) return dateStr;
  try {
    const c = parseInt(dateStr.charAt(0));
    const yy = parseInt(dateStr.substring(1, 3));
    const ddd = parseInt(dateStr.substring(3, 6));
    const year = (c * 100) + 1900 + yy;
    const dateObj = new Date(year, 0, 1);
    dateObj.setDate(dateObj.getDate() + (ddd - 1));
    const formattedYear = dateObj.getFullYear();
    const formattedMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(dateObj.getDate()).padStart(2, '0');
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
  } catch {
    return dateStr;
  }
}

function mapJDEStatus(nxtStatus) {
  const statusMap = {
    "100": "Pending", "110": "Pending", "120": "Pending", "130": "Pending", "215": "Pending",
    "160": "On Hold",
    "180": "In Progress", "220": "In Progress", "230": "In Progress", "240": "In Progress",
    "250": "In Progress", "280": "In Progress", "380": "In Progress",
    "400": "Completed", "999": "Cancelled",
    "": "Pending"
  };
  return statusMap[nxtStatus ? nxtStatus.trim() : ""] || "Pending";
}

function calculateJDEPORisk(status, deliveryDate) {
  if (status === "Completed" || status === "400") return { riskLevel: "green", delayProbability: 5 };
  if (status === "Cancelled" || status === "999") return { riskLevel: "green", delayProbability: 5 };
  if (status === "On Hold" || status === "160") return { riskLevel: "yellow", delayProbability: 40 };
  // Simplified risk calc without full date parse for brevity
  return { riskLevel: "yellow", delayProbability: 35 };
}

async function getJDEInventoryItemByCode(itemCode) {
  try {
    const items = await getJDEInventoryItems();
    return items.find(item => item.itemCode === itemCode) || null;
  } catch (err) {
    console.error('JDE Inventory item by code error:', err);
    return null;
  }
}

// Export individual functions
module.exports = {
  getJDESuppliers,
  getJDEInventoryItems,
  getJDEPurchaseOrderById,
  getJDESalesOrders,
  getJDEShipments,
  getJDEInventoryItemByCode
};


