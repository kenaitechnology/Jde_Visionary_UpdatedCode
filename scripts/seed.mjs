import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper to generate random number in range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min, max, decimals = 2) => (Math.random() * (max - min) + min).toFixed(decimals);

// Format date for MySQL
const formatDate = (date) => date ? date.toISOString().slice(0, 19).replace('T', ' ') : null;

console.log("🌱 Seeding database...");

// Seed Suppliers
const supplierData = [
  { supplierCode: "SUP001", name: "Global Electronics Ltd", contactName: "John Smith", email: "john@globalelec.com", phone: "+1-555-0101", city: "Shanghai", country: "China", category: "Electronics", leadTimeDays: 14, reliabilityScore: "92.50", onTimeDeliveryRate: "94.00", qualityScore: "91.00" },
  { supplierCode: "SUP002", name: "Pacific Components Inc", contactName: "Sarah Chen", email: "sarah@pacificcomp.com", phone: "+1-555-0102", city: "Taipei", country: "Taiwan", category: "Electronics", leadTimeDays: 10, reliabilityScore: "88.75", onTimeDeliveryRate: "86.00", qualityScore: "90.50" },
  { supplierCode: "SUP003", name: "EuroTech Manufacturing", contactName: "Hans Mueller", email: "hans@eurotech.eu", phone: "+49-555-0103", city: "Munich", country: "Germany", category: "Machinery", leadTimeDays: 21, reliabilityScore: "95.00", onTimeDeliveryRate: "97.00", qualityScore: "96.00" },
  { supplierCode: "SUP004", name: "American Steel Works", contactName: "Mike Johnson", email: "mike@amsteelworks.com", phone: "+1-555-0104", city: "Pittsburgh", country: "USA", category: "Raw Materials", leadTimeDays: 7, reliabilityScore: "85.25", onTimeDeliveryRate: "82.00", qualityScore: "88.00" },
  { supplierCode: "SUP005", name: "Tokyo Precision Parts", contactName: "Yuki Tanaka", email: "yuki@tokyoprecision.jp", phone: "+81-555-0105", city: "Tokyo", country: "Japan", category: "Components", leadTimeDays: 12, reliabilityScore: "97.00", onTimeDeliveryRate: "98.50", qualityScore: "99.00" },
  { supplierCode: "SUP006", name: "India Tech Solutions", contactName: "Raj Patel", email: "raj@indiatech.in", phone: "+91-555-0106", city: "Bangalore", country: "India", category: "Electronics", leadTimeDays: 18, reliabilityScore: "78.50", onTimeDeliveryRate: "75.00", qualityScore: "82.00" },
  { supplierCode: "SUP007", name: "Brazilian Metals Corp", contactName: "Carlos Silva", email: "carlos@brazilmetals.br", phone: "+55-555-0107", city: "Sao Paulo", country: "Brazil", category: "Raw Materials", leadTimeDays: 25, reliabilityScore: "81.00", onTimeDeliveryRate: "79.00", qualityScore: "84.00" },
  { supplierCode: "SUP008", name: "Korean Semiconductor Co", contactName: "Kim Lee", email: "kim@koreansemi.kr", phone: "+82-555-0108", city: "Seoul", country: "South Korea", category: "Electronics", leadTimeDays: 11, reliabilityScore: "94.50", onTimeDeliveryRate: "93.00", qualityScore: "95.50" },
];

for (const supplier of supplierData) {
  await connection.execute(
    `INSERT INTO suppliers (supplierCode, name, contactName, email, phone, city, country, category, leadTimeDays, reliabilityScore, onTimeDeliveryRate, qualityScore, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [supplier.supplierCode, supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.city, supplier.country, supplier.category, supplier.leadTimeDays, supplier.reliabilityScore, supplier.onTimeDeliveryRate, supplier.qualityScore]
  );
}
console.log("✅ Suppliers seeded");

// Seed Inventory Items
const inventoryData = [
  { itemCode: "ELEC-001", description: "Microcontroller Unit MCU-X500", category: "Electronics", quantityOnHand: 2500, quantityReserved: 800, reorderPoint: 500, safetyStock: 200, averageDailyDemand: "45.00", unitCost: "12.50", warehouseLocation: "WH-A1", primarySupplierId: 1 },
  { itemCode: "ELEC-002", description: "Power Management IC PM-200", category: "Electronics", quantityOnHand: 150, quantityReserved: 100, reorderPoint: 300, safetyStock: 150, averageDailyDemand: "35.00", unitCost: "8.75", warehouseLocation: "WH-A2", primarySupplierId: 2 },
  { itemCode: "COMP-001", description: "Precision Bearing Assembly PBA-100", category: "Components", quantityOnHand: 800, quantityReserved: 200, reorderPoint: 400, safetyStock: 100, averageDailyDemand: "25.00", unitCost: "45.00", warehouseLocation: "WH-B1", primarySupplierId: 5 },
  { itemCode: "COMP-002", description: "Hydraulic Valve HV-300", category: "Components", quantityOnHand: 120, quantityReserved: 80, reorderPoint: 150, safetyStock: 50, averageDailyDemand: "12.00", unitCost: "125.00", warehouseLocation: "WH-B2", primarySupplierId: 3 },
  { itemCode: "RAW-001", description: "Aluminum Sheet 6061-T6", category: "Raw Materials", quantityOnHand: 5000, quantityReserved: 1500, reorderPoint: 2000, safetyStock: 500, averageDailyDemand: "150.00", unitCost: "3.25", warehouseLocation: "WH-C1", primarySupplierId: 4 },
  { itemCode: "RAW-002", description: "Stainless Steel Rod SS-316", category: "Raw Materials", quantityOnHand: 300, quantityReserved: 200, reorderPoint: 500, safetyStock: 200, averageDailyDemand: "40.00", unitCost: "18.50", warehouseLocation: "WH-C2", primarySupplierId: 7 },
  { itemCode: "ELEC-003", description: "Memory Module DDR5-4800", category: "Electronics", quantityOnHand: 1200, quantityReserved: 400, reorderPoint: 600, safetyStock: 200, averageDailyDemand: "55.00", unitCost: "65.00", warehouseLocation: "WH-A3", primarySupplierId: 8 },
  { itemCode: "MACH-001", description: "CNC Spindle Motor SM-5000", category: "Machinery", quantityOnHand: 25, quantityReserved: 10, reorderPoint: 20, safetyStock: 5, averageDailyDemand: "2.00", unitCost: "2500.00", warehouseLocation: "WH-D1", primarySupplierId: 3 },
  { itemCode: "ELEC-004", description: "Sensor Array Module SAM-100", category: "Electronics", quantityOnHand: 80, quantityReserved: 60, reorderPoint: 100, safetyStock: 40, averageDailyDemand: "8.00", unitCost: "95.00", warehouseLocation: "WH-A4", primarySupplierId: 6 },
  { itemCode: "COMP-003", description: "Thermal Interface Material TIM-Pro", category: "Components", quantityOnHand: 3000, quantityReserved: 500, reorderPoint: 1000, safetyStock: 300, averageDailyDemand: "80.00", unitCost: "2.50", warehouseLocation: "WH-B3", primarySupplierId: 1 },
];

for (const item of inventoryData) {
  const available = item.quantityOnHand - item.quantityReserved;
  const daysOfSupply = Math.floor(available / parseFloat(item.averageDailyDemand));
  let stockoutRisk = 'low';
  let predictedStockoutDate = null;
  
  if (daysOfSupply <= 7) {
    stockoutRisk = 'critical';
    predictedStockoutDate = formatDate(new Date(Date.now() + daysOfSupply * 24 * 60 * 60 * 1000));
  } else if (daysOfSupply <= 14) {
    stockoutRisk = 'high';
    predictedStockoutDate = formatDate(new Date(Date.now() + daysOfSupply * 24 * 60 * 60 * 1000));
  } else if (daysOfSupply <= 21) {
    stockoutRisk = 'medium';
  }
  
  await connection.execute(
    `INSERT INTO inventory_items (itemCode, description, category, quantityOnHand, quantityReserved, quantityAvailable, reorderPoint, safetyStock, averageDailyDemand, daysOfSupply, stockoutRisk, predictedStockoutDate, unitCost, warehouseLocation, primarySupplierId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE quantityOnHand = VALUES(quantityOnHand)`,
    [item.itemCode, item.description, item.category, item.quantityOnHand, item.quantityReserved, available, item.reorderPoint, item.safetyStock, item.averageDailyDemand, daysOfSupply, stockoutRisk, predictedStockoutDate, item.unitCost, item.warehouseLocation, item.primarySupplierId]
  );
}
console.log("✅ Inventory items seeded");

// Seed Purchase Orders
const poStatuses = ['pending', 'approved', 'shipped', 'in_transit', 'delivered'];
const priorities = ['low', 'medium', 'high', 'critical'];

for (let i = 1; i <= 50; i++) {
  const poNumber = `PO-2026-${String(i).padStart(5, '0')}`;
  const supplierId = randomInt(1, 8);
  const itemId = randomInt(1, 10);
  const quantity = randomInt(50, 500);
  const unitPrice = randomDecimal(10, 200);
  const totalAmount = (quantity * parseFloat(unitPrice)).toFixed(2);
  const orderDate = randomDate(new Date('2025-11-01'), new Date('2026-01-20'));
  const requestedDeliveryDate = new Date(orderDate.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000);
  const promisedDeliveryDate = new Date(requestedDeliveryDate.getTime() + randomInt(-3, 5) * 24 * 60 * 60 * 1000);
  
  let status = poStatuses[randomInt(0, 4)];
  let actualDeliveryDate = null;
  let predictedDeliveryDate = null;
  let delayProbability = randomDecimal(0, 100);
  let riskLevel = 'green';
  
  if (status === 'delivered') {
    actualDeliveryDate = formatDate(new Date(promisedDeliveryDate.getTime() + randomInt(-5, 10) * 24 * 60 * 60 * 1000));
    delayProbability = '0.00';
  } else {
    predictedDeliveryDate = formatDate(new Date(promisedDeliveryDate.getTime() + randomInt(-2, 8) * 24 * 60 * 60 * 1000));
    if (parseFloat(delayProbability) > 70) riskLevel = 'red';
    else if (parseFloat(delayProbability) > 40) riskLevel = 'yellow';
  }
  
  const priority = priorities[randomInt(0, 3)];
  
  await connection.execute(
    `INSERT INTO purchase_orders (poNumber, supplierId, itemId, quantity, unitPrice, totalAmount, orderDate, requestedDeliveryDate, promisedDeliveryDate, actualDeliveryDate, predictedDeliveryDate, delayProbability, status, riskLevel, priority) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [poNumber, supplierId, itemId, quantity, unitPrice, totalAmount, formatDate(orderDate), formatDate(requestedDeliveryDate), formatDate(promisedDeliveryDate), actualDeliveryDate, predictedDeliveryDate, delayProbability, status, riskLevel, priority]
  );
}
console.log("✅ Purchase orders seeded");

// Seed Sales Orders
const soStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const customers = [
  { name: "Acme Corporation", code: "ACME001" },
  { name: "TechGiant Industries", code: "TECH001" },
  { name: "Global Manufacturing Co", code: "GLOB001" },
  { name: "Precision Parts Ltd", code: "PREC001" },
  { name: "Innovation Systems Inc", code: "INNO001" },
  { name: "Future Electronics", code: "FUTR001" },
  { name: "Atlas Automation", code: "ATLS001" },
  { name: "Quantum Devices", code: "QNTM001" },
];

for (let i = 1; i <= 60; i++) {
  const soNumber = `SO-2026-${String(i).padStart(5, '0')}`;
  const customer = customers[randomInt(0, 7)];
  const itemId = randomInt(1, 10);
  const quantity = randomInt(10, 200);
  const unitPrice = randomDecimal(15, 300);
  const totalAmount = (quantity * parseFloat(unitPrice)).toFixed(2);
  const orderDate = randomDate(new Date('2025-11-01'), new Date('2026-01-20'));
  const requestedShipDate = new Date(orderDate.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000);
  const promisedShipDate = new Date(requestedShipDate.getTime() + randomInt(-2, 3) * 24 * 60 * 60 * 1000);
  
  let status = soStatuses[randomInt(0, 4)];
  let actualShipDate = null;
  let fulfillmentRisk = 'green';
  
  if (status === 'shipped' || status === 'delivered') {
    actualShipDate = formatDate(new Date(promisedShipDate.getTime() + randomInt(-3, 5) * 24 * 60 * 60 * 1000));
  } else {
    const riskRoll = Math.random();
    if (riskRoll > 0.85) fulfillmentRisk = 'red';
    else if (riskRoll > 0.65) fulfillmentRisk = 'yellow';
  }
  
  const priority = priorities[randomInt(0, 3)];
  
  await connection.execute(
    `INSERT INTO sales_orders (soNumber, customerName, customerCode, itemId, quantity, unitPrice, totalAmount, orderDate, requestedShipDate, promisedShipDate, actualShipDate, status, priority, fulfillmentRisk) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [soNumber, customer.name, customer.code, itemId, quantity, unitPrice, totalAmount, formatDate(orderDate), formatDate(requestedShipDate), formatDate(promisedShipDate), actualShipDate, status, priority, fulfillmentRisk]
  );
}
console.log("✅ Sales orders seeded");

// Seed Shipments
const carriers = ["FedEx", "UPS", "DHL", "Maersk", "COSCO", "DB Schenker"];
const shipmentStatuses = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delayed'];

for (let i = 1; i <= 30; i++) {
  const shipmentNumber = `SHP-2026-${String(i).padStart(5, '0')}`;
  const carrier = carriers[randomInt(0, 5)];
  const trackingNumber = `${carrier.substring(0, 3).toUpperCase()}${randomInt(100000000, 999999999)}`;
  const purchaseOrderId = randomInt(1, 50);
  const origin = ["Shanghai, China", "Taipei, Taiwan", "Munich, Germany", "Tokyo, Japan", "Seoul, South Korea"][randomInt(0, 4)];
  const destination = "Chicago, IL, USA";
  
  const estimatedDeparture = randomDate(new Date('2025-12-01'), new Date('2026-01-15'));
  const actualDeparture = new Date(estimatedDeparture.getTime() + randomInt(-1, 2) * 24 * 60 * 60 * 1000);
  const transitDays = randomInt(5, 21);
  const estimatedArrival = new Date(actualDeparture.getTime() + transitDays * 24 * 60 * 60 * 1000);
  const predictedArrival = new Date(estimatedArrival.getTime() + randomInt(-2, 5) * 24 * 60 * 60 * 1000);
  
  let status = shipmentStatuses[randomInt(0, 5)];
  let actualArrival = null;
  let riskLevel = 'green';
  let delayReason = null;
  let temperatureAlert = false;
  let temperature = null;
  
  if (status === 'delivered') {
    actualArrival = formatDate(new Date(estimatedArrival.getTime() + randomInt(-3, 7) * 24 * 60 * 60 * 1000));
  } else if (status === 'delayed') {
    riskLevel = 'red';
    delayReason = ["Port congestion", "Weather delay", "Customs clearance", "Carrier capacity issues"][randomInt(0, 3)];
  } else {
    const riskRoll = Math.random();
    if (riskRoll > 0.85) riskLevel = 'red';
    else if (riskRoll > 0.65) riskLevel = 'yellow';
  }
  
  // Simulate temperature for some shipments
  if (Math.random() > 0.7) {
    temperature = randomDecimal(-5, 35);
    if (parseFloat(temperature) > 25 || parseFloat(temperature) < 2) {
      temperatureAlert = true;
    }
  }
  
  await connection.execute(
    `INSERT INTO shipments (shipmentNumber, purchaseOrderId, carrier, trackingNumber, origin, destination, estimatedDeparture, actualDeparture, estimatedArrival, predictedArrival, actualArrival, status, riskLevel, delayReason, temperature, temperatureAlert) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [shipmentNumber, purchaseOrderId, carrier, trackingNumber, origin, destination, formatDate(estimatedDeparture), formatDate(actualDeparture), formatDate(estimatedArrival), formatDate(predictedArrival), actualArrival, status, riskLevel, delayReason, temperature, temperatureAlert ? 1 : 0]
  );
}
console.log("✅ Shipments seeded");

// Seed Alerts
const alertData = [
  { type: 'stockout_warning', severity: 'critical', title: 'Critical Stock Level: Power Management IC', message: 'Item ELEC-002 (Power Management IC PM-200) has only 1.4 days of supply remaining. Immediate action required to prevent production stoppage.', relatedEntityType: 'inventory', relatedEntityId: 2 },
  { type: 'delivery_delay', severity: 'warning', title: 'PO-2026-00015 Shipment Delayed', message: 'Purchase Order PO-2026-00015 from Global Electronics Ltd is experiencing delays due to port congestion. New ETA is 5 days later than originally promised.', relatedEntityType: 'purchase_order', relatedEntityId: 15 },
  { type: 'supplier_issue', severity: 'warning', title: 'Supplier Performance Alert: India Tech Solutions', message: 'Supplier SUP006 (India Tech Solutions) on-time delivery rate has dropped below 80% threshold. Consider alternative suppliers for critical orders.', relatedEntityType: 'supplier', relatedEntityId: 6 },
  { type: 'temperature_alert', severity: 'critical', title: 'Temperature Threshold Exceeded: SHP-2026-00012', message: 'Shipment SHP-2026-00012 has recorded temperature of 32°C, exceeding the 25°C threshold for electronic components. Quality inspection recommended upon arrival.', relatedEntityType: 'shipment', relatedEntityId: 12 },
  { type: 'stockout_warning', severity: 'warning', title: 'Low Stock Warning: Stainless Steel Rod', message: 'Item RAW-002 (Stainless Steel Rod SS-316) is projected to stock out within 7 days based on current demand patterns.', relatedEntityType: 'inventory', relatedEntityId: 6 },
  { type: 'delivery_delay', severity: 'critical', title: 'Critical Delay: CNC Spindle Motor Order', message: 'PO-2026-00028 for CNC Spindle Motors has 85% probability of delay. This may impact production schedule for Q1 orders.', relatedEntityType: 'purchase_order', relatedEntityId: 28 },
];

for (const alert of alertData) {
  await connection.execute(
    `INSERT INTO alerts (type, severity, title, message, relatedEntityType, relatedEntityId, isRead, isResolved) 
     VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    [alert.type, alert.severity, alert.title, alert.message, alert.relatedEntityType, alert.relatedEntityId]
  );
}
console.log("✅ Alerts seeded");

// Seed Demand History (last 90 days for each item)
const today = new Date();
for (let itemId = 1; itemId <= 10; itemId++) {
  const baseDemand = randomInt(20, 100);
  for (let day = 90; day >= 0; day--) {
    const date = new Date(today.getTime() - day * 24 * 60 * 60 * 1000);
    // Add some seasonality and randomness
    const seasonalFactor = 1 + 0.2 * Math.sin((day / 30) * Math.PI);
    const randomFactor = 0.8 + Math.random() * 0.4;
    const quantity = Math.floor(baseDemand * seasonalFactor * randomFactor);
    
    await connection.execute(
      `INSERT INTO demand_history (itemId, date, quantity, source) VALUES (?, ?, ?, 'sales')`,
      [itemId, formatDate(date), quantity]
    );
  }
}
console.log("✅ Demand history seeded");

console.log("🎉 Database seeding completed!");
await connection.end();
process.exit(0);
