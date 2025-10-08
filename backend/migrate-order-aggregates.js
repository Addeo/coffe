/**
 * Migration script to populate Order aggregate fields from existing work_reports
 * 
 * This script fills regularHours, overtimeHours, calculatedAmount, carUsageAmount,
 * and organizationPayment fields in orders table by aggregating data from work_reports.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔄 Starting migration: Aggregate work_reports data into orders...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database\n');
});

// Get all orders with their work reports
const query = `
  SELECT 
    o.id as orderId,
    o.title,
    o.status,
    wr.id as workReportId,
    wr.totalHours,
    wr.isOvertime,
    wr.calculatedAmount,
    wr.carUsageAmount,
    wr.organizationPayment
  FROM orders o
  LEFT JOIN work_reports wr ON wr.orderId = o.id
  WHERE wr.id IS NOT NULL
  ORDER BY o.id
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('❌ Error fetching data:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`📊 Found ${rows.length} work report records\n`);

  // Group by orderId
  const orderData = {};
  rows.forEach(row => {
    if (!orderData[row.orderId]) {
      orderData[row.orderId] = {
        id: row.orderId,
        title: row.title,
        status: row.status,
        regularHours: 0,
        overtimeHours: 0,
        calculatedAmount: 0,
        carUsageAmount: 0,
        organizationPayment: 0,
        workReportCount: 0
      };
    }

    // Since old work_reports had isOvertime based on overtimeHours > 0,
    // we need to extract regular/overtime from the work_report
    // For simplicity, if isOvertime=1, all hours are overtime, otherwise regular
    if (row.isOvertime) {
      orderData[row.orderId].overtimeHours += row.totalHours;
    } else {
      orderData[row.orderId].regularHours += row.totalHours;
    }

    orderData[row.orderId].calculatedAmount += row.calculatedAmount;
    orderData[row.orderId].carUsageAmount += row.carUsageAmount;
    orderData[row.orderId].organizationPayment += row.organizationPayment;
    orderData[row.orderId].workReportCount++;
  });

  const orders = Object.values(orderData);
  console.log(`📦 Aggregated data for ${orders.length} orders\n`);

  // Update orders
  let completed = 0;
  let errors = 0;

  const updateOrder = (order) => {
    return new Promise((resolve, reject) => {
      const updateQuery = `
        UPDATE orders 
        SET 
          regularHours = ?,
          overtimeHours = ?,
          calculatedAmount = ?,
          carUsageAmount = ?,
          organizationPayment = ?
        WHERE id = ?
      `;

      db.run(
        updateQuery,
        [
          order.regularHours,
          order.overtimeHours,
          order.calculatedAmount,
          order.carUsageAmount,
          order.organizationPayment,
          order.id
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  };

  // Process orders sequentially
  (async () => {
    for (const order of orders) {
      try {
        await updateOrder(order);
        completed++;
        console.log(`✅ Order #${order.id} "${order.title}": ` +
          `${order.regularHours}h regular + ${order.overtimeHours}h overtime = ` +
          `${order.calculatedAmount + order.carUsageAmount} RUB ` +
          `(${order.workReportCount} work reports)`);
      } catch (err) {
        errors++;
        console.error(`❌ Error updating order #${order.id}:`, err.message);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`   ✅ Updated: ${completed} orders`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} orders`);
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n📦 Database connection closed');
      }
      process.exit(errors > 0 ? 1 : 0);
    });
  })();
});
