const { getPool, sql } = require('./db');

async function resolveShortCode(shortCode) {
  const pool = await getPool();

  // Step 1: look up the long URL for this short code.
  const urlResult = await pool
    .request()
    .input('shortCode', sql.VarChar(10), shortCode)
    .query('SELECT Id, LongUrl FROM dbo.Urls WHERE ShortCode = @shortCode');

  if (urlResult.recordset.length === 0) {
    return null;
  }

  const { Id, LongUrl } = urlResult.recordset[0];

  // Step 2: log the click. In the real app this will carry the actual
  // referrer/user-agent from the request; here we fake them since there's
  // no HTTP request yet, just to prove the insert works.
  await pool
    .request()
    .input('urlId', sql.Int, Id)
    .input('referrer', sql.NVarChar(2048), 'manual-test')
    .input('userAgent', sql.NVarChar(1024), 'shell-script')
    .query('INSERT INTO dbo.Clicks (UrlId, Referrer, UserAgent) VALUES (@urlId, @referrer, @userAgent)');

  return LongUrl;
}

async function main() {
  const shortCode = process.argv[2];

  if (!shortCode) {
    console.error('Usage: node redirect-test.js <short-code>');
    process.exit(1);
  }

  try {
    const longUrl = await resolveShortCode(shortCode);

    if (!longUrl) {
      console.log(`No URL found for short code "${shortCode}".`);
    } else {
      console.log(`"${shortCode}" resolves to: ${longUrl}`);
      console.log('A click was logged in dbo.Clicks.');
    }
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
