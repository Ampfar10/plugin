import yts from "yt-search"; // Using yt-search for searching YouTube videos
import ytdl from "youtube-dl-exec"; // For fetching audio from YouTube
import axios from "axios";
import fs from "fs/promises";
import path from "path";

const sanitizeFileName = (name) => name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").substring(0, 200);

// Function to ensure the download directory exists
async function ensureDownloadDirectory() {
    const downloadDir = path.join(process.cwd(), "downloads");
    try {
        await fs.mkdir(downloadDir, { recursive: true });
        console.log(`Download directory confirmed: ${downloadDir}`);
    } catch (error) {
        console.error("Error creating download directory:", error);
    }
    return downloadDir;
}

// Function to download audio
async function downloadAudio(url, output) {
    try {
        console.log(`Starting audio download from ${url}...`);
        await ytdl(url, {
            extractAudio: true,
            audioFormat: "mp3",
            output,
        });
        console.log(`Audio downloaded: ${output}`);
    } catch (error) {
        console.error("Error during audio download:", error);
        throw new Error("Failed to download audio.");
    }
}

// Function to delete the file after sending it
async function deleteFile(filePath, delayMs = 60000) {
    setTimeout(async () => {
        try {
            await fs.unlink(filePath);
            console.log(`File deleted: ${filePath}`);
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    }, delayMs);
}

module.exports = {
    name: "play",
    aliases: ["song"],
    category: "Utils",
    async execute(conn, chatId, args, senderId, msg) {
        if (!args.length) {
            return conn.sendMessage(chatId, {
                text: "🎵 Please provide a song name or artist to search.",
                quoted: msg,
            });
        }

        const songName = args.join(" ");
        let firstResult = null;

        try {
            // Search YouTube using yt-search
            const searchResponse = await yts(songName);
            if (!searchResponse || searchResponse.videos.length === 0) {
                return conn.sendMessage(chatId, {
                    text: "⚠️ Sorry, I couldn't find the song.",
                    quoted: msg,
                });
            }

            firstResult = searchResponse.videos[0];

            // Use the YouTube URL in the primary API
            const primaryApiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${firstResult.url}`;
            const primaryApiResponse = await axios.get(primaryApiUrl);

            if (primaryApiResponse.data?.status) {
                const data = primaryApiResponse.data.data;

                await conn.sendMessage(chatId, {
                    text: "🎶 Preparing your song. Please wait...",
                    quoted: msg,
                });

                return conn.sendMessage(chatId, {
                    audio: { url: data.dl },
                    mimetype: "audio/mp3",
                    contextInfo: {
                        externalAdReply: {
                            title: data.title,
                            body: firstResult.description || "Enjoy your audio!",
                            mediaType: 2,
                            thumbnailUrl: firstResult.thumbnail,
                            renderLargerThumbnail: true,
                            mediaUrl: firstResult.url,
                        },
                    },
                });
            }

            throw new Error("Primary API method failed. Falling back to secondary method...");
        } catch (primaryApiError) {
            console.error("Primary API method failed. Trying fallback method:", primaryApiError);
            await conn.sendMessage(chatId, {
                text: "Failed to get audio using the primary server. Switching to fallback method...",
                quoted: msg,
            });

            try {
                if (!firstResult) {
                    return conn.sendMessage(chatId, {
                        text: "⚠️ Sorry, no results found for the song.",
                        quoted: msg,
                    });
                }

                const downloadDir = await ensureDownloadDirectory();
                const sanitizedTitle = sanitizeFileName(firstResult.title);
                const filePath = path.join(downloadDir, `${sanitizedTitle}.mp3`);

                // Download the audio using youtube-dl
                await downloadAudio(firstResult.url, filePath);

                await conn.sendMessage(chatId, {
                    text: "🎶 Preparing your song. Please wait...",
                    quoted: msg,
                });

                // Send the audio file
                await conn.sendMessage(chatId, {
                    audio: { url: filePath },
                    mimetype: "audio/mp3",
                    contextInfo: {
                        externalAdReply: {
                            title: firstResult.title,
                            body: "Here is your requested audio!",
                            mediaType: 2,
                            thumbnailUrl: firstResult.thumbnail,
                            renderLargerThumbnail: true,
                            mediaUrl: firstResult.url,
                        },
                    },
                });

                // Delete the file after sending
                await deleteFile(filePath);
            } catch (fallbackError) {
                console.error("Fallback method failed:", fallbackError);
                await conn.sendMessage(chatId, {
                    text: "❌ An error occurred while fetching the song. Please try again later.",
                    quoted: msg,
                });
            }
        }
    },
};
