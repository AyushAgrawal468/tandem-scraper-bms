const { autoScroll, delay } = require("./utils");

module.exports = async function scrapeCategory(
  browser,
  url,
  location,
  categoryTab,
) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
  await delay(8000);
  await autoScroll(page);

  // ✅ Step 1: Extract all event detail links from <a> tags
  let extendedUrl = "";

  switch (categoryTab) {
    case "Movies":
    case "upcoming-movies":
      extendedUrl = "/movies/";
      break;
    case "Events":
      extendedUrl = "/events/";
      break;
    case "Plays":
      extendedUrl = "/plays/";
      break;
    case "Activities":
      extendedUrl = "/activities/";
      break;
    case "Sports":
      extendedUrl = "/sports/";
      break;
    default:
      extendedUrl = "";
      break;
  }
  const eventLinks = await page.$$eval(`a[href*="${extendedUrl}"]`, (anchors) =>
    anchors.map((a) => a.href),
  );

  const eventList = [];

  for (const link of eventLinks) {
    const detailPage = await browser.newPage();
    try {
      await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 0 });
      await delay(5000);

      const data = await detailPage.evaluate(
        (loc, categoryTab) => {
          const title = document.querySelector("h1")?.innerText || "Untitled";
        let eventDate = "TBD";
       const parentDiv = document.querySelectorAll(".sc-2k6tnd-1.kAzEtX")[1];
       if (parentDiv) {
         const childNodes = Array.from(parentDiv.childNodes);
         for (const node of childNodes) {
           if (node.nodeType === Node.TEXT_NODE) {
             const text = node.textContent.trim();
             if (/\d{1,2} \w{3}, \d{4}/.test(text)) {
               eventDate = text;
               break;
             }
           }
         }
       }

       // Attempt 2: Check .sc-bsek5f-4.alAPB
       if (eventDate === "TBD") {
         const releaseEl = document.querySelector(".sc-bsek5f-4.alAPB");
         if (releaseEl) {
           const match = releaseEl.innerText.match(/\d{1,2} \w{3}, \d{4}/);
           if (match) eventDate = match[0];
         }
       }

       // Attempt 3: Fallback to .sc-7o7nez-0.djdFxA (raw text)
       if (eventDate === "TBD") {
         const altDateEl = document.querySelector(".sc-7o7nez-0.djdFxA");
         if (altDateEl && altDateEl.innerText.trim()) {
           eventDate = altDateEl.innerText.trim();
         }
       }
          let image = "N/A";
          const imgTags = Array.from(document.querySelectorAll("img"));

          for (const img of imgTags) {
            const src = img.src;
            if (src && !src.includes("share_v2.png")) {
              image = src;
              break;
            }
          }

          return {
            title,
            category: categoryTab,
            eventDate,
            image,
            location: loc,
          };
        },
        location,
        categoryTab,
      );
      eventList.push(data);
    } catch (e) {
      console.error(`[WARN] Error scraping ${link}: ${e.message}`);
    } finally {
      await detailPage.close();
    }
  }

  await page.close();
  return eventList;
};
