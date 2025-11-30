// scraper/mainScraper.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const axios = require('axios');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = [
  'indore','bengaluru','mumbai','national-capital-region-ncr','hyderabad',
  'ahmedabad','chandigarh','chennai','pune','kolkata','kochi'
];
const CATEGORY_TABS = ['Activities','Movies','upcoming-movies','Events','Plays','Sports'];

/**
 * Post a batch to callbackUrl with simple retries and exponential backoff.
 * The Spring controller you showed expects a JSON array string in the body,
 * so we send JSON.stringify(batch) as the request body.
 *
 * @param {string} callbackUrl
 * @param {Array} batch
 * @param {object} meta optional metadata used only for logging
 */
async function postCallbackWithRetries(callbackUrl, batch, meta = {}, retries = 3) {
  if (!callbackUrl) return { success: false, reason: 'No callbackUrl provided' };

  const payload = JSON.stringify(batch); // controller expects a JSON array string
  let attempt = 0;
  let lastErr = null;

  while (attempt < retries) {
    attempt++;
    try {
      console.log(chalk.blue(`[INFO] Posting callback for ${meta.location || 'unknown'} / ${meta.category || 'unknown'} (attempt ${attempt}) — ${batch.length} items`));
      const resp = await axios.post(callbackUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60_000
      });

      if (resp.status >= 200 && resp.status < 300) {
        console.log(chalk.green(`[✓] Callback accepted (status ${resp.status}) for ${meta.location || '-'} / ${meta.category || '-'}`));
        return { success: true, status: resp.status };
      } else {
        lastErr = new Error(`Unexpected status ${resp.status}`);
        console.warn(chalk.yellow(`[WARN] Callback returned status ${resp.status}`));
      }
    } catch (err) {
      lastErr = err;
      console.warn(chalk.yellow(`[WARN] Callback attempt ${attempt} failed: ${err.message}`));
    }

    // exponential backoff: 1s, 2s, 4s...
    const backoffMs = 1000 * Math.pow(2, attempt - 1);
    await new Promise((r) => setTimeout(r, backoffMs));
  }

  console.error(chalk.red(`[ERROR] Callback failed after ${retries} attempts for ${meta.location || '-'} / ${meta.category || '-'}: ${lastErr?.message}`));
  return { success: false, reason: lastErr?.message || 'unknown' };
}

/**
 * mainScraper(baseUrl, callbackUrl, maxEvents)
 * - baseUrl: currently not used by internal code but kept for compatibility
 * - callbackUrl: required by your route
 * - maxEvents: total max events to collect across all locations/categories (null for unlimited)
 */
module.exports = async function mainScraper(baseUrl, callbackUrl, maxEvents = 100) {
  const allEvents = [];
  const maxLimit = maxEvents === null ? null : Math.floor(maxEvents);

  for (const location of LOCATIONS) {
    if (maxLimit !== null && allEvents.length >= maxLimit) break;

    const browser = await puppeteer.launch({
      headless: false, // change to true for headless runs
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const categoryTab of CATEGORY_TABS) {
      if (maxLimit !== null && allEvents.length >= maxLimit) break;

      const url = `https://in.bookmyshow.com/explore/${categoryTab.toLowerCase()}-${location}`;
      console.log(chalk.yellow(`[INFO] Scraping: ${url}`));

      try {
        const remainingSlots = maxLimit === null ? null : Math.max(0, maxLimit - allEvents.length);
        // scrapeCategory should accept (browser, url, location, categoryTab, maxEventsToScrape)
        const events = await scrapeCategory(browser, url, location, categoryTab, remainingSlots);

        console.log(chalk.green(`[✓] Scraped ${events.length} events for ${categoryTab} @ ${location}`));

        // send batch to callback immediately for this city+category
        if (callbackUrl && events.length > 0) {
          try {
            const cbResult = await postCallbackWithRetries(callbackUrl, events, { location, category: categoryTab }, 3);
            if (!cbResult.success) {
              // Log and continue. If you want stronger guarantees, persist locally and retry later.
              console.warn(chalk.yellow(`[WARN] Callback failed for ${categoryTab}@${location}: ${cbResult.reason}`));
            }
          } catch (cbErr) {
            console.error(chalk.red(`[ERROR] Unexpected callback error for ${categoryTab}@${location}: ${cbErr.message}`));
          }
        }

        // aggregate into master list (respect maxLimit)
        if (events.length > 0) {
          if (maxLimit === null) {
            allEvents.push(...events);
          } else {
            const slots = maxLimit - allEvents.length;
            if (slots > 0) {
              allEvents.push(...events.slice(0, slots));
            }
          }
        }

        if (maxLimit !== null && allEvents.length >= maxLimit) {
          console.log(chalk.cyan(`[INFO] Reached maxEvents limit (${maxLimit}). Stopping.`));
          break;
        }
      } catch (err) {
        console.error(chalk.red(`[ERROR] Failed scraping ${categoryTab} in ${location}: ${err.message}`));
      }
    }

    await browser.close();
  }

  return allEvents;
};
