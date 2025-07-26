const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const LOCATIONS = ['mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad']; // Expandable

app.post('/scrape', async (req, res) => {
    const { baseUrl } = req.body;
    if (!baseUrl) return res.status(400).send({ error: 'Missing baseUrl' });

    const allEvents = [];

    for (const location of LOCATIONS) {
        const fullUrl = `${baseUrl}/${location}`;
        console.log(chalk.yellow(`[INFO] Scraping: ${fullUrl}`));

        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            );
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

            await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 0 });
            await new Promise(resolve => setTimeout(resolve, 8000));
            await autoScroll(page);

            const eventHandles = await page.$$('div.sc-7o7nez-0, div.__event-card');
            console.log(chalk.magenta(`[INFO] Found ${eventHandles.length} potential cards on ${location}`));

            for (const cardHandle of eventHandles) {
                try {
                    const title = await cardHandle.evaluate(card => card.innerText.trim().split('\n')[0]);

                    const excludedTitles = ['See All', 'Hindi', 'Marathi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Gujarati', 'Bengali', 'Punjabi','See All ›','Drama','Horror/Mystery/Thriller'
                    ,'Drama/Musical/Romantic','Comedy/Thriller','Drama/Romantic','Spanish'];
                    if (!title || excludedTitles.includes(title)) continue;

                    const image = await cardHandle.$eval('img', img => img.src).catch(() => null);
                    const category = await cardHandle.evaluate(card => {
                        const match = card.innerText.match(/(Music|Comedy|Theatre|Movie|Workshop|Exhibition|Festival)/i);
                        return match ? match[0] : 'General';
                    });

                    // Open event detail in new tab
                    const linkHandle = await cardHandle.$('a');
                    const href = linkHandle ? await linkHandle.evaluate(a => a.href) : null;

                    let eventDate = 'TBD';
                    if (href) {
                        const detailPage = await browser.newPage();
                        await detailPage.setUserAgent(page._userAgent);
                        await detailPage.goto(href, { waitUntil: 'networkidle2', timeout: 0 });

                        // Scrape event date (e.g. from "18 Jul, 2025")
                        try {
                            await detailPage.waitForSelector('body', { timeout: 5000 }); // safety
                            const detailText = await detailPage.content();
                            const dateMatch = detailText.match(/\d{1,2} \w{3,9},? \d{4}/); // Flexible format
                            if (dateMatch) {
                                eventDate = dateMatch[0].replace(',', '').trim(); // Normalize
                            }
                        } catch (err) {
                            console.warn(chalk.yellow(`[WARN] Could not get event date for: ${title}`));
                        }

                        await detailPage.close();
                    }

                    allEvents.push({
                        title,
                        category,
                        eventDate,
                        image: image || 'N/A',
                        location
                    });
                } catch (innerErr) {
                    console.error(chalk.red(`[ERROR] Failed to process event card:`), innerErr.message);
                    continue;
                }
            }

            await browser.close();
            console.log(chalk.green(`[✓] ${allEvents.length} total events after ${location}`));

        } catch (error) {
            console.error(chalk.red(`[ERROR] Failed to scrape ${location}:`), error.message);
        }
    }

    console.log(chalk.blue(`[INFO] Final Total Events: ${allEvents.length}`));
    res.json(allEvents);
});


const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Node scraper running on http://localhost:${PORT}`);
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}
