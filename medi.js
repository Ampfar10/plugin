const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

module.exports = {
    name: 'mediafire',
    description: 'Download files from MediaFire links and send them.',
    category: '🗂️Media',
    async execute(conn, chatId, args, senderId) {
        const mediafireUrl = args[0]?.trim();

        if (!mediafireUrl || !mediafireUrl.includes('mediafire.com')) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a valid MediaFire URL.',
                mentions: [senderId],
            });
        }

        const resMessage = await conn.sendMessage(chatId, {
            text: '⏳ Fetching the MediaFire file...',
            mentions: [senderId],
        });

        try {
            // Launch Puppeteer
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();

            // Go to the MediaFire URL
            await page.goto(mediafireUrl, {
                waitUntil: 'networkidle2',
            });

            // Wait for the download button
            await page.waitForSelector('a#downloadButton', { timeout: 10000 });

            // Extract the download link
            const downloadLink = await page.$eval('a#downloadButton', (el) =>
                el.getAttribute('href')
            );

            if (!downloadLink) {
                throw new Error('Download link not found.');
            }

            const filename = decodeURIComponent(downloadLink.split('/').pop().split('?')[0]);

            // Close Puppeteer
            await browser.close();

            // Download the file
            const downloadDir = path.join(process.cwd(), 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }
            const filePath = path.join(downloadDir, filename);

            await conn.sendMessage(chatId, {
                text: `📂 Downloading *${filename}*...`,
                mentions: [senderId],
            });

            const response = await axios({
                url: downloadLink,
                method: 'GET',
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Send the file to the chat
            await conn.sendMessage(chatId, {
                document: { url: filePath },
                mimetype: 'application/octet-stream',
                fileName: filename,
                caption: `📥 Successfully downloaded: *${filename}*`,
                mentions: [senderId],
            });

            // Clean up
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error downloading from MediaFire:', error);
            await conn.sendMessage(chatId, {
                text: '❌ Failed to download the MediaFire file. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
