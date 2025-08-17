// Query audit_logs for a specific course ID
require('dotenv').config({ path: require('path').join(__dirname, '.env.development') });
const { Client } = require('pg');

const COURSE_ID = process.argv[2];
if (!COURSE_ID) {
  console.error('Usage: node query-audit-for-course.js <COURSE_ID>');
  process.exit(1);
}

async function queryAuditLogs() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    const sql = `SELECT * FROM audit_logs WHERE entity_type = 'course' AND entity_id = $1 ORDER BY created_at DESC;`;
    const res = await client.query(sql, [COURSE_ID]);
    console.log(res.rows);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await client.end();
  }
}

queryAuditLogs();
