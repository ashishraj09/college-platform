// List all course IDs, names, and codes using direct SQL (pg)
require('dotenv').config({ path: require('path').join(__dirname, '.env.development') });
const { Client } = require('pg');

async function listCourses() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    const sql = 'SELECT id, name, code FROM courses ORDER BY created_at DESC;';
    const res = await client.query(sql);
    console.log(res.rows);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await client.end();
  }
}

listCourses();
