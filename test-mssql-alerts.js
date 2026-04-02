// Test script for MSSQL alert resolution
const { createAlertResolutionsTable, resolveAlert, getResolvedAlerts } = require('./server/jdeDb.ts');

async function testAlertResolution() {
  try {
    console.log('Testing MSSQL alert resolution...');

    // Create the table
    console.log('Creating alert resolutions table...');
    await createAlertResolutionsTable();
    console.log('Table created successfully');

    // Resolve an alert
    console.log('Resolving alert ID -1001 for user 1...');
    await resolveAlert(-1001, 1, 'Test resolution action');
    console.log('Alert resolved successfully');

    // Get resolved alerts
    console.log('Fetching resolved alerts for user 1...');
    const resolvedAlerts = await getResolvedAlerts(1);
    console.log('Resolved alerts:', resolvedAlerts);

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAlertResolution();
}

module.exports = { testAlertResolution };