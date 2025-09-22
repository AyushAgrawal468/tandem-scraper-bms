const express = require('express');
const router = express.Router();
const mainScraper = require('../scraper/mainScraper');

router.post('/', async (req, res) => {
    const { baseUrl } = req.body;
    if (!baseUrl) return res.status(400).json({ error: 'Missing baseUrl' });

    try {
        const allEvents = await mainScraper(baseUrl);
        res.json(allEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// router.get('/', (req, res) => {
//     const dummyEvents = [
//         {
//             title: "Concert",
//             category: "Music",
//             location: "Mumbai",
//             eventDate: "2025-09-10",
//             eventTime: "19:00",
//             scrapedAt: new Date(),
//             additionalData: {}
//         }
//     ];
//     res.json(dummyEvents);
// });

module.exports = router;

