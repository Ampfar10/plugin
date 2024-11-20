const fetch = require('node-fetch');
const fs = require('fs/promises');
const path = require('path');

module.exports = {
    name: 'mediafire',
    description: 'Downloads files from MediaFire and sends them to the chat.',
    category: '🗂️ Media',
    async execute(conn, chatId, args, senderId) {
        const mediafireUrl = args[0]?.trim();

        if (!mediafireUrl || !mediafireUrl.startsWith('https://www.mediafire.com')) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a valid MediaFire URL.',
                mentions: [senderId],
            });
        }

        const resMessage = await conn.sendMessage(chatId, {
            text: '⏳ Fetching MediaFire file, please wait...',
            mentions: [senderId],
        });

        try {
            // Fetch the file data from the API
            const apiUrl = `https://api.agatz.xyz/api/mediafire?url=${encodeURIComponent(mediafireUrl)}`;
            const apiResponse = await fetch(apiUrl);
            const apiData = await apiResponse.json();

            if (apiData.status !== 200) {
                throw new Error('Failed to fetch data from the MediaFire API.');
            }

            // Extract the download link from the API response
            const downloadLink = apiData.data[0]?.link;
            const fileName = apiData.data[0]?.nama || `mediafire-file-${Date.now()}`;
            const mimeType = apiData.data[0]?.mime || 'application/octet-stream';

            // Fetch the file from the download link
            const fileResponse = await fetch(downloadLink);
            if (!fileResponse.ok) {
                throw new Error(`Failed to download the file from MediaFire: ${fileResponse.statusText}`);
            }

            // Save the file locally
            const downloadDir = path.join(process.cwd(), 'downloads');
            await fs.mkdir(downloadDir, { recursive: true });
            const filePath = path.join(downloadDir, fileName);
            const fileBuffer = await fileResponse.buffer();
            await fs.writeFile(filePath, fileBuffer);

            // Send the file to the chat
            await conn.sendMessage(chatId, {
                document: { url: filePath },
                mimetype: mimeType,
                fileName: fileName,
                caption: '📂 Here is your MediaFire file.',
                mentions: [senderId],
            });

            // Clean up downloaded file
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Error downloading from MediaFire:', error);
            await conn.sendMessage(chatId, {
                text: '❌ Failed to download the MediaFire file. Please check the URL or try again later.',
                mentions: [senderId],
            });
        }
    },
};
