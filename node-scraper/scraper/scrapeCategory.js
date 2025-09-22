const { autoScroll, delay } = require("./utils");

module.exports = async function scrapeCategory(
  browser,
  url,
  location,
  categoryTab,
  maxEventsToScrape = null // New parameter for limiting events
) {
  const context = browser.defaultBrowserContext(); // ✅ context comes from browser
  await context.overridePermissions("https://in.bookmyshow.com", [
    "geolocation",
  ]); // or empty array if denying

  const page = await browser.newPage();

  // ✅ Set geolocation permission for the page
  await page.setGeolocation({ latitude: 0, longitude: 0 }); // dummy location

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
  const eventLinks = await page.$$eval(
    `a[href*="${extendedUrl}"]`,
    (anchors) => {
      return  anchors.map((a) => a.href)
      // return anchors
      //   .filter((a) => {
      //     const text = a.innerText?.trim() || "";
      //     return text.length > 0 && a.href.includes("/events/");
      //   })
      //   .map((a) => a.href);
    }
  );

  //   let eventLinks = await page.$$eval(`a[href*="${extendedUrl}"]`, (anchors) =>
  //   anchors
  //     .filter((a) => {
  //       const text = a.innerText?.trim() || "";
  //       return text.length > 0 && a.href.includes("/events/");
  //     })
  //     .map((a) => a.href)
  // );

  // ✅ only keep first 5
  // const limitedEventLinks = eventLinks.slice(0, 5);

  const eventList = [];

  for (const link of eventLinks) {
    // Stop if we've reached the maximum number of events to scrape
    if (maxEventsToScrape !== null && eventList.length >= maxEventsToScrape) {
      break;
    }

    const detailPage = await browser.newPage();
    try {
      await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 0 });
      await delay(5000);

      const data = await detailPage.evaluate(
        (loc, categoryTab, eventLink) => {
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

          // let description = Array.from(
          //   document.querySelectorAll(".sc-o4g232-1.gWZZxz")
          // )
          //   .map((el) => el.textContent.trim())
          //   .filter((text) => text.length > 0)
          //   .flatMap((text) => {
          //     const firstPart = "About the movie";
          //     if (text.startsWith(firstPart)) {
          //       let rest = text.slice(firstPart.length).trim();
          //       return [
          //         firstPart,
          //         ...rest
          //           .split(/\n+/)
          //           .map((s) => s.trim())
          //           .filter(Boolean),
          //       ];
          //     }
          //     return text
          //       .split(/\n+/)
          //       .map((s) => s.trim())
          //       .filter(Boolean);
          //   });

          let details = Array.from(
            document.querySelectorAll(".sc-2k6tnd-1.kAzEtX")
          )
            .map((el) => el.textContent.trim())
            .filter((text) => text.length > 0)
            .flatMap((text) => {
              // Split by newline in case multiple lines inside one element
              return text
                .split(/\n+/)
                .map((s) => s.trim())
                .filter(Boolean);
            });

          let event_date = "TBD";
          let eventTime = "TBD";

          const detailsBox = document.querySelector(".__event-info-card");
          if (detailsBox) {
            const items = Array.from(detailsBox.querySelectorAll("div"))
              .map((el) => el.innerText.trim())
              .filter(Boolean);

            if (items.length > 0) {
              event_date = items[0] || "TBD"; // Dates
              eventTime = items[1] || "TBD"; // Time
            }
          }

          // --- PRICE ---
          let price =
            document
              .querySelector("span.sc-1qdowf4-0.ebnmka")
              ?.textContent.trim() || "ND";



let description = [];

try {
  // Try 1: Rich paragraphs inside known container + new tags
  const richDesc = Array.from(
    document.querySelectorAll(
      'div.sc-133848s-3.sc-133848s-10.bbHlLd.cAvuTR p,div.sc-omw9zj-1.gtXiAS p,h2.sc-7o7nez-0.kpDMmD,.sc-o4g232-2.jYiJma,.sc-o4g232-3.hLIMsj,div.sc-omw9zj-1.gtXiAS'
    )
  )
    .map(el => el.textContent.trim())
    .filter(text => text.length > 0);

  if (richDesc.length > 0) {
    description = richDesc;
  } else {
    // Try 2: Fallback to full innerText split, include new tags
    const fallbackEl =
      document.querySelector('div.sc-133848s-3.sc-133848s-10.bbHlLd.cAvuTR') ||
      document.querySelector('h2.sc-7o7nez-0.kpDMmD') ||
      
      document.querySelector('div[data-ref="event-description"]') ||
      // document.querySelector('.sc-o4g232-0.bZQlrR') ||
      document.querySelector('.sc-o4g232-2.jYiJma') ||
      document.querySelector('.sc-o4g232-3.hLIMsj') ||
      document.querySelector('div.sc-omw9zj-1.gtXiAS') && document.querySelector('div.sc-omw9zj-1.gtXiAS p') ;

    const rawText = fallbackEl?.innerText || "";

    if (rawText.trim().length > 0) {
      description = rawText
        .split(/\n+/)
        .map(text => text.trim())
        .filter(text => text.length > 0);
    }
  }

  // Try 3: If still empty, grab longest block of text on page
  if (description.length === 0) {
    const candidates = Array.from(document.querySelectorAll("section, div"))
      .map(el => el.textContent.trim())
      .filter(text => text.length > 100); // Only long blocks

    if (candidates.length > 0) {
      description = candidates[0]
        .split(/\n+/)
        .map(text => text.trim())
        .filter(text => text.length > 0);
    }
  }

  // Remove unwanted headings from description
  const unwanted = [
    "Show more",
    "Read Less",
    "Artists",
    "M-Ticket",
    "Facilities",
    "You May Also Like",
    "You Should Know",
    "Gallery",
    "About The Venue"
    // aur bhi headings add kar sakte hain
  ];
  description = description.filter(
    text => !unwanted.some(h => text.trim().toLowerCase() === h.toLowerCase())
  );
  // Remove duplicate lines
  description = Array.from(new Set(description));
} catch (err) {
  console.warn("Description extraction failed:", err.message);
}


let tags = Array.from(
  document.querySelectorAll('div.sc-133848s-2.sc-133848s-12.ccqrhI.jgYpvq div.sc-7o7nez-0.eoWuFo')
).map(el => el.textContent.trim()).filter(tag => tag.length > 0);



          return {
            title,
            category: categoryTab,
            eventDate,
            eventTime,
            image,
            location: loc,
            price,
            eventLink: eventLink,
            description,
            tags,
          };
        },
        location,
        categoryTab,
        link
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
