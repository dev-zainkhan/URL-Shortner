const express = require('express');
const path = require('path');
const { shortenUrl, resolveShortCode } = require('./urlService');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snip &mdash; short links that route anywhere</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="sheet">
    <div class="perf"></div>
    ${body}
  </main>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.send(page(`
    <p class="eyebrow">Route any link</p>
    <h1 class="wordmark">Snip</h1>
    <p class="lede">Paste a long address below. Get back a short tracking code that redirects anywhere, instantly.</p>

    <form action="/shorten" method="POST" class="form">
      <label for="long_url">destination URL</label>
      <input type="url" id="long_url" name="long_url" placeholder="https://example.com/a/very/long/path" required>
      <button type="submit">Create short link</button>
    </form>
  `));
});

app.post('/shorten', async (req, res) => {
  const { long_url } = req.body;

  if (!long_url) {
    return res.status(400).send(page(`
      <p class="eyebrow">Route any link</p>
      <h1 class="wordmark">Snip</h1>
      <div class="alert"><strong>Return to sender.</strong> Enter a destination URL first.</div>
      <p class="back"><a href="/">&larr; Try again</a></p>
    `));
  }

  try {
    const result = await shortenUrl(long_url);
    const shortUrl = `${BASE_URL}/${result.shortCode}`;

    res.send(page(`
      <p class="eyebrow">Tracking code issued</p>

      <div class="result-row">
        <div class="barcode"></div>
        <div class="stamp">${result.shortCode}</div>
      </div>

      <p class="destination">&rarr; ${escapeHtml(long_url)}</p>

      <label for="short_url" class="copy-label">Click to select, then copy</label>
      <input id="short_url" type="text" class="copy-field" value="${shortUrl}" readonly onclick="this.select()">

      <p class="back"><a href="${shortUrl}" target="_blank">Open it in a new tab</a> &middot; <a href="/">Create another</a></p>
    `));
  } catch (err) {
    console.error(err);
    res.status(500).send(page(`
      <p class="eyebrow">Route any link</p>
      <h1 class="wordmark">Snip</h1>
      <div class="alert"><strong>Something went wrong.</strong> ${escapeHtml(err.message)}</div>
      <p class="back"><a href="/">&larr; Try again</a></p>
    `));
  }
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Must stay last so it doesn't swallow /, /shorten, /health.
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const longUrl = await resolveShortCode(code, req.get('referer'), req.get('user-agent'));

    if (!longUrl) {
      return res.status(404).send(page(`
        <p class="eyebrow">Return to sender</p>
        <h1 class="wordmark">Not found</h1>
        <p class="lede">No destination is registered for <strong>${escapeHtml(code)}</strong>.</p>
        <p class="back"><a href="/">&larr; Create a short link</a></p>
      `));
    }

    res.redirect(302, longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});
