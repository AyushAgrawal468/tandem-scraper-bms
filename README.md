📽️ BookMyShow Event Scraper
A Node.js-based web scraper that extracts detailed event data (Movies, Events, Plays, Sports, Activities) from BookMyShow, using Puppeteer with stealth plugins to avoid detection. It supports infinite scrolling, dynamic content loading, and structured data extraction. The scraped data can be sent to a Spring Boot backend or stored in a database.

🔧 Technologies Used
Node.js

Puppeteer Extra (with Stealth Plugin)

Cheerio (optional for HTML parsing)

Spring Boot (Java 17+)

PostgreSQL

Docker (optional)

📦 Project Structure
bash
Copy
Edit
bookmyshow-scraper/
│
├── mainScraper.js         # Entry point that orchestrates the scraping
├── scrapeCategory.js      # Scrapes a specific category and location
├── utils.js               # Contains autoScroll() and delay()
├── scraperRoute.js        # (Optional) Express route if exposed via API
├── .env                   # Store secrets or base URL
└── README.md              # Project documentation
🚀 Features
✅ Category-based scraping: Movies, Events, Plays, Sports, Activities

✅ Location support: Mumbai (default), easily extendable

✅ Infinite scroll handling with custom autoScroll logic

✅ Image fallback handling (skips placeholder images)

✅ Multiple fallback methods for retrieving event date

✅ Outputs structured event data (title, date, category, location, image)

✅ Integration-ready with Spring Boot backend

📥 Sample Output (JSON)
json
Copy
Edit
{
  "title": "Oppenheimer",
  "category": "Movies",
  "eventDate": "25 Jul, 2025",
  "image": "https://assets-in.bmscdn.com/path/to/image.jpg",
  "location": "mumbai"
}
📋 Setup Instructions
1. Clone the Repository
bash
Copy
Edit
git clone https://github.com/AyushAgrawal468/tandem-scraper-bms/tree/main
cd bookmyshow-scraper
2. Install Dependencies
bash
Copy
Edit
npm install
3. Set Your Config
Create a .env file (optional):

env
Copy
Edit
BASE_URL=https://in.bookmyshow.com/explore
Or set it inline in mainScraper.js.

4. Run the Scraper
bash
Copy
Edit
node mainScraper.js
The default configuration scrapes events from Mumbai.

⚙️ Configuration
In mainScraper.js:

js
Copy
Edit
const LOCATIONS = ['mumbai'];
const CATEGORY_TABS = ['Movies', 'Events', 'Plays', 'Activities', 'Sports'];
Change as needed.

🧠 Logic Overview
🔁 Scrolling
utils.js contains:

js
Copy
Edit
exports.autoScroll = async function(page) {
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
};
🔗 Backend Integration (Optional)
The data can be sent to your Spring Boot API:

js
Copy
Edit
await axios.post('http://localhost:8080/api/events', eventList);
Or saved locally as JSON/CSV.

🧪 Testing
To test with limited data:

In scrapeCategory.js, limit the loop:

js
Copy
Edit
if (eventList.length >= 10) break;
🛡️ Anti-Bot Bypass
Using puppeteer-extra-plugin-stealth to bypass detection:

js
Copy
Edit
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
📌 To-Do
 Add location via CLI

 Add Express API for live trigger

 Add MongoDB/PostgreSQL storage connector

 Export to CSV

📃 License
MIT License — free to use, modify, and distribute.