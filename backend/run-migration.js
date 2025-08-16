// Run a SQL migration file using Node.js and pg
require('dotenv').config({ path: require('path').join(__dirname, '.env.development') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');



const MIGRATION_FILE = process.argv[2] || path.join(__dirname, 'migrations', '20250815-group-enrollment.sql');

async function runMigration() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
