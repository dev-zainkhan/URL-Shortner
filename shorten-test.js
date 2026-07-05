const { getPool, sql } = require('./db');

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Converts a numeric row Id into a short base62 string.
// Using the Id itself (rather than a random string) guarantees the code is
// unique for free, since the DB already enforces Id uniqueness.
function encodeBase62(num) {
  if (num === 0) return ALPHABET[0];
  let code = '';
  while (num > 0) {
    code = ALPHABET[num % 62] + code;
    num = Math.floor(num / 62);
  }
  return code;
}

async function shortenUrl(longUrl) {
  const pool = await getPool();

  // Step 1: insert the long URL, let SQL Server assign the Id.
  const insertResult = await pool
    .request()
    .input('longUrl', sql.NVarChar(2048), longUrl)
    .query('INSERT INTO dbo.Urls (LongUrl) OUTPUT INSERTED.Id VALUES (@longUrl)');

  const id = insertResult.recordset[0].Id;

  // Step 2: turn that Id into a short code.
  const shortCode = encodeBase62(id);

  // Step 3: save the code back onto the same row.
  await pool
    .request()
    .input('id', sql.Int, id)
    .input('shortCode', sql.VarChar(10), shortCode)
    .query('UPDATE dbo.Urls SET ShortCode = @shortCode WHERE Id = @id');

  return { id, shortCode, longUrl };
}

async function main() {
  const longUrl = process.argv[2];

  if (!longUrl) {
    console.error('Usage: node shorten-test.js <a-long-url>');
    process.exit(1);
  }

  try {
    const result = await shortenUrl(longUrl);
    console.log('Inserted row Id:', result.id);
    console.log('Generated short code:', result.shortCode);
    console.log('Maps to:', result.longUrl);
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
