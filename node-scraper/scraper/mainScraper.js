const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['mumbai','national-capital-region-ncr','bengaluru','hyderabad','ahmedabad','chandigarh','chennai','pune','kolkata','kochi'];
const CATEGORY_TABS = ['Movies','upcoming-movies','Events','Plays','Sports','Activities'];

module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];
    const maxEvents = 5; // Set to null for unlimited scraping

    for (const location of LOCATIONS) {
        if (maxEvents !== null && allEvents.length >= maxEvents) break;

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const categoryTab of CATEGORY_TABS) {
            if (maxEvents !== null && allEvents.length >= maxEvents) break;

            const url = `https://in.bookmyshow.com/explore/${categoryTab.toLowerCase()}-${location}`;
            console.log(chalk.yellow(`[INFO] Scraping: ${url}`));

            try {
                const remainingSlots = maxEvents === null ? null : maxEvents - allEvents.length;
                const events = await scrapeCategory(browser, url, location, categoryTab, remainingSlots);
                console.log(chalk.green(`[✓] ${events.length} from ${categoryTab} in ${location}`));
                
                allEvents.push(...events);
                
                if (maxEvents !== null && allEvents.length >= maxEvents) {
                    console.log(chalk.cyan(`[INFO] Reached maximum of ${maxEvents} events. Stopping scraper.`));
                    break;
                }
            } catch (err) {
                console.error(chalk.red(`[ERROR] ${categoryTab} in ${location}: ${err.message}`));
            }
        }

        await browser.close();
    }

    return allEvents;
};
