// Script to inspect enrollments table columns and constraints
require('dotenv').config({ path: require('path').join(__dirname, '.env.development') });
const { Client } = require('pg');

async function inspectEnrollmentsTable() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    console.log('Columns:');
    const columns = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'enrollments';`);
    columns.rows.forEach(row => console.log(row));
    console.log('\nUnique Constraints:');
    const constraints = await client.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'enrollments'::regclass AND contype = 'u';`);
    constraints.rows.forEach(row => console.log(row));
  } catch (err) {
    console.error('Error inspecting table:', err);
  } finally {
    await client.end();
  }
}

inspectEnrollmentsTable();
