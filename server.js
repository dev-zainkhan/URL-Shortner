const express = require('express');
const { shortenUrl, resolveShortCode } = require('./urlService');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.urlencoded({ extended: true }));

// Deliberately plain, unstyled HTML for now -- just enough to test the
// server end to end from a browser. Styling comes later.
app.get('/', (req, res) => {
  res.send(`
    <h1>URL Shortener (plain, no styling yet)</h1>
    <form action="/shorten" method="POST">
      <input type="url" name="long_url" placeholder="https://example.com/..." required>
      <button type="submit">Shorten</button>
    </form>
  `);
});

app.post('/shorten', async (req, res) => {
  const { long_url } = req.body;

  if (!long_url) {
    return res.status(400).send('Missing long_url.');
  }

  try {
    const result = await shortenUrl(long_url);
    const shortUrl = `${BASE_URL}/${result.shortCode}`;
    res.send(`
      <p>Your short link — click the box to select it, then Ctrl+C to copy:</p>
      <p><input type="text" value="${shortUrl}" readonly onclick="this.select()" style="width:320px; padding:6px; font-size:14px;"></p>
      <p><a href="${shortUrl}" target="_blank">Open it in a new tab</a></p>
      <p><a href="/">Back</a></p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong: ' + err.message);
  }
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Must stay last so it doesn't swallow /, /shorten, /health.
app.get('/:code', async (req, res) => {
  try {
    const longUrl = await resolveShortCode(
      req.params.code,
      req.get('referer'),
      req.get('user-agent')
    );

    if (!longUrl) {
      return res.status(404).send('Short link not found.');
    }

    res.redirect(302, longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
