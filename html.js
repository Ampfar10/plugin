const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'html',
    description: 'Fetches HTML content of a URL or renders HTML code as an image.',
    category: 'Utility',
    async execute(conn, chatId, args, ownerId, senderId) {
        console.log(`[html command] Executing command for user: ${senderId}, with args: ${args.join(' ')}`);

        // Check if input is a URL or HTML code
        const input = args.join(' ');
        const isURL = /^https?:\/\/[^\s]+$/.test(input);

        try {
            if (isURL) {
                // Fetch HTML from the URL
                const response = await axios.get(input);
                const htmlContent = response.data;

                // Send HTML content as text
                await conn.sendMessage(chatId, {
                    text: `🔗 HTML content from ${input}:\n\n${htmlContent.substring(0, 4000)}...`, // Limit to 4000 chars
                    mentions: [senderId]
                });
            } else {
                // Render HTML code as an image
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.setContent(input);
                const screenshotPath = path.join(__dirname, '../temp', 'html_screenshot.png');
                await page.screenshot({ path: screenshotPath, fullPage: true });
                await browser.close();

                // Send image of HTML rendering
                await conn.sendMessage(chatId, {
                    image: { url: screenshotPath },
                    caption: '🖼️ Here is the rendered HTML:',
                    mentions: [senderId]
                });

                // Delete screenshot after sending
                fs.unlinkSync(screenshotPath);
            }
        } catch (error) {
            console.error(`[html command] Error in processing: ${error}`);
            await conn.sendMessage(chatId, {
                text: '⚠️ An error occurred while processing the HTML. Please try again.',
                mentions: [senderId]
            });
        }
    }
};
