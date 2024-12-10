const axios = require("axios");
const yts = require("yt-search"); // Using yt-search for searching YouTube videos
const ytdl = require("youtube-dl-exec"); // For fetching audio from YouTube
const fs = require("fs/promises");
const path = require("path");

// Sanitize file names
const sanitizeFileName = (name) => {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").substring(0, 200);
};

// Ensure the download directory exists
async function ensureDownloadDirectory() {
    const downloadDir = path.join(process.cwd(), "downloads");
    await fs.mkdir(downloadDir, { recursive: true });
    return downloadDir;
}

// Download audio using youtube-dl-exec
async function downloadAudio(url, output) {
    try {
        console.log(`Downloading audio from ${url}...`);
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

// Delete file after sending
async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        console.log(`File deleted: ${filePath}`);
    } catch (error) {
        console.error("Error deleting file:", error);
    }
}

module.exports = {
    name: "play",
    description: "Play a song by searching or downloading it.",
    category: "🗂️Media",
    async execute(conn, chatId, args, senderId, msg) {
        if (!args.length) {
            return conn.sendMessage(chatId, {
                text: "🎵 Please provide a song name or artist to search.",
                quoted: msg,
            });
        }

        const songName = args.join(" ");

        try {
            // Try API Method First
            const apiUrl = `https://miyanapi.vercel.app/youtube?query=${encodeURIComponent(songName)}`;
            const apiResponse = await axios.get(apiUrl);

            if (apiResponse.data?.data?.length > 0) {
                const firstResult = apiResponse.data.data[0];

                const audioUrl = `https://miyanapi.vercel.app/youtube?url=${encodeURIComponent(firstResult.url)}`;
                const audioResponse = await axios.get(audioUrl);

                if (audioResponse.data?.data?.audio_url) {
                    // Send API result
                    await conn.sendMessage(chatId, {
                        text: `🎧 Fetching *${firstResult.title}* for you. Please wait...`,
                        quoted: msg,
                    });

                    return conn.sendMessage(chatId, {
                        audio: { url: audioResponse.data.data.audio_url },
                        mimetype: "audio/mp4",
                        ptt: false,
                        contextInfo: {
                            externalAdReply: {
                                title: firstResult.title,
                                body: `${firstResult.url}`,
                                mediaType: 2, // YouTube video
                                thumbnailUrl: firstResult.thumbnail || "default_thumbnail_url",
                                renderLargerThumbnail: true,
                                mediaUrl: firstResult.url,
                            },
                        },
                    });
                }
            }

            throw new Error("API method failed. Falling back to manual method...");
        } catch (apiError) {
            console.error("API method failed:", apiError);
            await conn.sendMessage(chatId, {
                text: "Failed to fetch from the first source. Switching to a different method...",
                quoted: msg,
            });

            try {
                // Fallback Method: Search for the song using yt-search
                const searchResponse = await yts(songName);
                if (!searchResponse || searchResponse.videos.length === 0) {
                    return conn.sendMessage(chatId, {
                        text: "⚠️ Sorry, I couldn't find the song.",
                        quoted: msg,
                    });
                }

                const firstResult = searchResponse.videos[0];
                const downloadDir = await ensureDownloadDirectory();
                const fileName = sanitizeFileName(firstResult.title);
                const filePath = path.join(downloadDir, `${fileName}.mp3`);

                // Download the audio
                await downloadAudio(firstResult.url, filePath);

                // Check if the file exists before sending
                try {
                    await fs.access(filePath);
                    console.log("File exists:", filePath);
                } catch (error) {
                    console.error("File does not exist or is inaccessible:", filePath);
                    throw new Error("File not found after download.");
                }

                await conn.sendMessage(chatId, {
                    text: "🎶 Preparing your song. Please wait...",
                    quoted: msg,
                });

                // Send the audio file
                await conn.sendMessage(chatId, {
                    audio: { url: filePath },
                    mimetype: "audio/mp4",
                    ptt: false,
                    contextInfo: {
                        externalAdReply: {
                            title: firstResult.title,
                            body: `${firstResult.url}`,
                            mediaType: 2, // YouTube video
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
                return conn.sendMessage(chatId, {
                    text: "❌ An error occurred while fetching the song. Please try again later.",
                    quoted: msg,
                });
            }
        }
    },
};
