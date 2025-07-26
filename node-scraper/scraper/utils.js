exports.autoScroll = async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let distance = 500;
            let lastHeight = 0;
            let sameHeightCounter = 0;
            const maxSameHeightTries = 5; // Number of consecutive checks with same height before stopping

            const interval = setInterval(() => {
                window.scrollBy(0, distance);
                const scrollHeight = document.body.scrollHeight;

                if (scrollHeight === lastHeight) {
                    sameHeightCounter++;
                    if (sameHeightCounter >= maxSameHeightTries) {
                        clearInterval(interval);
                        resolve();
                    }
                } else {
                    sameHeightCounter = 0;
                    lastHeight = scrollHeight;
                }
            }, 500); // scroll every 500ms
        });
    });
};

exports.delay = ms => new Promise(res => setTimeout(res, ms));