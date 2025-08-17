const { Sequelize } = require('sequelize');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  logging: false,
});

async function main() {
  try {
    const [auditLogs] = await sequelize.query('SELECT * FROM audit_logs LIMIT 10;');
    const [messages] = await sequelize.query('SELECT * FROM messages LIMIT 10;');
    const [auditSchema] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs';");
    const [messageSchema] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages';");
    console.log('Audit Logs:', auditLogs);
    console.log('Audit Log Schema:', auditSchema);
    console.log('Messages:', messages);
    console.log('Message Schema:', messageSchema);
  } catch (err) {
    console.error('Error querying tables:', err);
  } finally {
    await sequelize.close();
  }
}

main();
