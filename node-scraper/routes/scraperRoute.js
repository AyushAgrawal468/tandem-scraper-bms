// routes/scraperRoute.js
const express = require('express');
const router = express.Router();
const mainScraper = require('../scraper/mainScraper');

router.post('/', async (req, res) => {
  try {
    const { baseUrl, callbackUrl, maxEvents } = req.body;

    if (!baseUrl) {
      return res.status(400).json({ error: 'Missing baseUrl' });
    }

    if (!callbackUrl) {
      return res.status(400).json({ error: 'Missing callbackUrl' });
    }

    // Interpret maxEvents:
    // - if omitted, or explicitly null, or the string 'all' -> scrape everything (null)
    // - otherwise must be a positive integer
    let max = null;
    if (maxEvents !== undefined && maxEvents !== null && maxEvents !== 'all') {
      const parsed = Number(maxEvents);
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        return res.status(400).json({ error: 'maxEvents must be a positive integer, null, or "all"' });
      }
      max = Math.floor(parsed);
    } // else max stays null -> unlimited

    const allEvents = await mainScraper(baseUrl, callbackUrl, max);
    return res.json(allEvents);
  } catch (err) {
    console.error('Scraper route error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
