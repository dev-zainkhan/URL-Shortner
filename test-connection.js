require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,              // RDS SQL Server expects an encrypted connection
    trustServerCertificate: true, // fine for dev; skips validating RDS's cert chain
  },
};

async function main() {
  console.log(`Connecting to ${config.database} on ${config.server}...`);

  try {
    const pool = await sql.connect(config);
    console.log('Connected successfully.');

    const result = await pool.request().query('SELECT COUNT(*) AS urlCount FROM dbo.Urls');
    console.log(`Urls table currently has ${result.recordset[0].urlCount} row(s).`);

    await pool.close();
    console.log('Connection closed.');
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

main();
