const fetch = require('node-fetch');
const fs = require('fs/promises');
const path = require('path');

module.exports = {
    name: "fb",
    aliases: ["fbdl", "facebook"],
    description: "Download Facebook videos and send them.",
    category: "🗂️Media",
    async execute(conn, chatId, args, senderId) {
        if (args.length === 0 || !args[0].includes("facebook.com")) {
            return conn.sendMessage(chatId, {
                text: "⚠️ Please provide a valid Facebook video URL.",
                mentions: [senderId],
            });
        }

        const videoUrl = args[0];

        try {
            // Notify the user
            await conn.sendMessage(chatId, {
                text: "📥 Fetching Facebook video...",
                mentions: [senderId],
            });

            // Fetch video data
            const apiURL = `https://api.agatz.xyz/api/facebook?url=${videoUrl}`;
            const response = await fetch(apiURL);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const downloadUrl = data.data.hd || data.data.sd;

            if (!downloadUrl) {
                throw new Error("Unable to retrieve the video.");
            }

            await conn.sendMessage(chatId, {
                text: "⬇️ Downloading the video...",
                mentions: [senderId],
            });

            // Download the video
            const downloadDir = path.join(process.cwd(), "downloads");
            await fs.mkdir(downloadDir, { recursive: true });
            const outputFile = path.join(downloadDir, `${Date.now()}.mp4`);
            const videoResponse = await fetch(downloadUrl);
            const videoBuffer = await videoResponse.buffer();
            await fs.writeFile(outputFile, videoBuffer);

            // Send the video
            await conn.sendMessage(chatId, {
                video: { url: outputFile },
                caption: "🎥 Here is your Facebook video!",
                mentions: [senderId],
            });

            // Clean up the downloaded file
            await fs.unlink(outputFile);
        } catch (error) {
            console.error("Error downloading Facebook video:", error);
            await conn.sendMessage(chatId, {
                text: "⚠️ Failed to download the video. Please try again later.",
                mentions: [senderId],
            });
        }
    },
};
