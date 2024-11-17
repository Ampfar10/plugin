const fetch = require('node-fetch');
const fs = require('fs/promises');
const path = require('path');

// Fetch TikTok video data
async function fetchVideoData(videoUrl) {
    const apiURL = `https://api.tiklydown.eu.org/api/download?url=${videoUrl}`;
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching video data:', error);
        throw new Error('Unable to download the TikTok video.');
    }
}

// Ensure the download directory exists
async function ensureDownloadDirectory() {
    const downloadDir = path.join(process.cwd(), 'downloads');
    await fs.mkdir(downloadDir, { recursive: true });
    return downloadDir;
}

module.exports = {
    name: 'tiktok',
    description: 'Download TikTok videos without watermark.',
    category: '🗂️Media',
    async execute(conn, chatId, args, senderId) {
        const query = args.join(' ').trim();

        if (!query.includes('tiktok.com')) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a valid TikTok video URL.',
                mentions: [senderId],
            });
        }

        const resMessage = await conn.sendMessage(chatId, {
            text: '⏳ Fetching TikTok video...',
            mentions: [senderId],
        });

        try {
            // Fetch video data
            const videoData = await fetchVideoData(query);
            const downloadUrl = videoData.video.noWatermark;

            if (!downloadUrl) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Unable to retrieve the video. Please try again later.',
                    mentions: [senderId],
                });
            }

            await conn.sendMessage(chatId, {
                text: '⏳ Downloading the video...',
                mentions: [senderId],
            });

            // Download the video
            const downloadDir = await ensureDownloadDirectory();
            const filePath = path.join(downloadDir, `${Date.now()}.mp4`);
            const response = await fetch(downloadUrl);
            const buffer = await response.buffer();
            await fs.writeFile(filePath, buffer);

            // Send the video
            await conn.sendMessage(chatId, {
                video: { url: filePath },
                caption: '🎥 Here is your TikTok video!',
                mentions: [senderId],
            });

            // Cleanup the downloaded file
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Error in tkdl command:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while processing your request. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
