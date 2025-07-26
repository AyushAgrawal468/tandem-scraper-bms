const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['mumbai','national-capital-region-ncr','bengaluru','hyderabad','ahmedabad','chandigarh','chennai','pune','kolkata','kochi'];
const CATEGORY_TABS = ['Movies','upcoming-movies','Events','Plays','Sports','Activities'];

module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];

    for (const location of LOCATIONS) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const categoryTab of CATEGORY_TABS) {
            const url = `https://in.bookmyshow.com/explore/${categoryTab.toLowerCase()}-${location}`;
            console.log(chalk.yellow(`[INFO] Scraping: ${url}`));

            try {
                const events = await scrapeCategory(browser, url, location, categoryTab);
                console.log(chalk.green(`[✓] ${events.length} from ${categoryTab} in ${location}`));
                allEvents.push(...events);
            } catch (err) {
                console.error(chalk.red(`[ERROR] ${categoryTab} in ${location}: ${err.message}`));
            }
        }

        await browser.close();
    }

    return allEvents;
};
