// Query any table in the database using direct SQL (pg)
require('dotenv').config({ path: require('path').join(__dirname, '.env.development') });
const { Client } = require('pg');

const TABLE = process.argv[2] || 'courses';
const FIELDS = process.argv[3] || 'id, name, code';

async function queryTable() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    const sql = `SELECT ${FIELDS} FROM ${TABLE} ORDER BY created_at DESC;`;
    const res = await client.query(sql);
    console.log(res.rows);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await client.end();
  }
}

queryTable();
