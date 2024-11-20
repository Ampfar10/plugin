const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

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
            // Fetch the MediaFire page with proper headers
            const response = await axios.get(mediafireUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                },
            });

            const $ = cheerio.load(response.data);

            // Extract the direct download link
            const downloadLink = $('a#downloadButton').attr('href');
            const filename = downloadLink.split('/').pop().split('?')[0];

            if (!downloadLink) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Unable to fetch the download link. Please check the URL.',
                    mentions: [senderId],
                });
            }

            // Set up download directory
            const downloadDir = path.join(process.cwd(), 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }
            const filePath = path.join(downloadDir, filename);

            // Notify the user
            await conn.sendMessage(chatId, {
                text: `📂 Downloading *${filename}*...`,
                mentions: [senderId],
            });

            // Download the file with proper headers
            const fileResponse = await axios({
                url: downloadLink,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                },
            });

            const fileStream = fs.createWriteStream(filePath);
            fileResponse.data.pipe(fileStream);

            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
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
