const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

module.exports = {
    name: 'screenshot',
    description: 'Takes a screenshot of a given URL and sends it back as an image.',
    category: 'Utilities',
    async execute(conn, chatId, args, ownerId, senderId) {
        const url = args[0];

        if (!url || !url.startsWith('http')) {
            await conn.sendMessage(chatId, {
                text: '⚠️ Please provide a valid URL to screenshot.',
                mentions: [senderId]
            });
            return;
        }

        try {
            // Launch Puppeteer
            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            // Set viewport for better screenshot control (optional)
            await page.setViewport({ width: 1280, height: 720 });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 600000 });

            // Take a screenshot
            const screenshotPath = path.join(__dirname, '../screenshots', `screenshot_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            await browser.close();

            // Send the screenshot back to the user
            await conn.sendMessage(chatId, {
                image: { url: screenshotPath },
                caption: `📸 Screenshot of ${url}`,
                mentions: [senderId]
            });

            // Clean up: delete the screenshot after sending it
            fs.unlinkSync(screenshotPath);
        } catch (error) {
            console.error('[screenshot command] Error taking screenshot:', error);
            await conn.sendMessage(chatId, {
                text: `⚠️ Error taking screenshot of ${url}. Please try again later.`,
                mentions: [senderId]
            });
        }
    }
};
