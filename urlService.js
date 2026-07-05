const { getPool, sql } = require('./db');

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function encodeBase62(num) {
  if (num === 0) return ALPHABET[0];
  let code = '';
  while (num > 0) {
    code = ALPHABET[num % 62] + code;
    num = Math.floor(num / 62);
  }
  return code;
}

// Same logic as shorten-test.js: insert, get the Id, encode it, save it back.
async function shortenUrl(longUrl) {
  const pool = await getPool();

  const insertResult = await pool
    .request()
    .input('longUrl', sql.NVarChar(2048), longUrl)
    .query('INSERT INTO dbo.Urls (LongUrl) OUTPUT INSERTED.Id VALUES (@longUrl)');

  const id = insertResult.recordset[0].Id;
  const shortCode = encodeBase62(id);

  await pool
    .request()
    .input('id', sql.Int, id)
    .input('shortCode', sql.VarChar(10), shortCode)
    .query('UPDATE dbo.Urls SET ShortCode = @shortCode WHERE Id = @id');

  return { id, shortCode, longUrl };
}

// Same logic as redirect-test.js, but takes real referrer/userAgent instead
// of hardcoded test values.
async function resolveShortCode(shortCode, referrer, userAgent) {
  const pool = await getPool();

  const urlResult = await pool
    .request()
    .input('shortCode', sql.VarChar(10), shortCode)
    .query('SELECT Id, LongUrl FROM dbo.Urls WHERE ShortCode = @shortCode');

  if (urlResult.recordset.length === 0) {
    return null;
  }

  const { Id, LongUrl } = urlResult.recordset[0];

  await pool
    .request()
    .input('urlId', sql.Int, Id)
    .input('referrer', sql.NVarChar(2048), referrer || null)
    .input('userAgent', sql.NVarChar(1024), userAgent || null)
    .query('INSERT INTO dbo.Clicks (UrlId, Referrer, UserAgent) VALUES (@urlId, @referrer, @userAgent)');

  return LongUrl;
}

module.exports = { shortenUrl, resolveShortCode, encodeBase62 };
