const express = require('express');
const app = express();
const scraperRoute = require('./routes/scraperRoute');

app.use(express.json());
app.use('/scrape', scraperRoute);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});