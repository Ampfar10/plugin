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
            // Fetch MediaFire page content
            const response = await fetch(mediafireUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch the MediaFire URL: ${response.statusText}`);
            }
            const pageContent = await response.text();

            // Extract download link
            const downloadLinkMatch = pageContent.match(/href="(https:\/\/download\.mediafire\.com\/[^\s"]+)"/);
            if (!downloadLinkMatch) {
                throw new Error('Failed to extract the download link from MediaFire page.');
            }
            const downloadLink = downloadLinkMatch[1];

            // Fetch file from the download link
            const fileResponse = await fetch(downloadLink);
            if (!fileResponse.ok) {
                throw new Error(`Failed to download the file: ${fileResponse.statusText}`);
            }

            // Save the file locally
            const contentDisposition = fileResponse.headers.get('content-disposition');
            const fileNameMatch = contentDisposition?.match(/filename="([^"]+)"/);
            const fileName = fileNameMatch ? fileNameMatch[1] : `mediafire-file-${Date.now()}`;

            const downloadDir = path.join(process.cwd(), 'downloads');
            await fs.mkdir(downloadDir, { recursive: true });
            const filePath = path.join(downloadDir, fileName);
            const fileBuffer = await fileResponse.buffer();
            await fs.writeFile(filePath, fileBuffer);

            // Send the file to the chat
            await conn.sendMessage(chatId, {
                document: { url: filePath },
                mimetype: fileResponse.headers.get('content-type') || 'application/octet-stream',
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
