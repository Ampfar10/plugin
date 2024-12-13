const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('youtube-dl-exec');
const fs = require('fs/promises');
const path = require('path');

// Function to ensure the download directory exists
async function ensureDownloadDirectory() {
    const downloadDir = path.join(process.cwd(), 'downloads');
    await fs.mkdir(downloadDir, { recursive: true });
    return downloadDir;
}

// Function to delete the file after sending it
async function deleteFileWithDelay(filePath, delayMs = 60000) {
    setTimeout(async () => {
        try {
            await fs.unlink(filePath);
            console.log(`File deleted: ${filePath}`);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }, delayMs);
}

// Function to download audio using youtube-dl
async function downloadAudio(url, outputPath) {
    try {
        console.log(`Downloading audio from ${url}...`);
        await ytdl(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: outputPath,
        });
        console.log(`Audio downloaded: ${outputPath}`);
    } catch (error) {
        console.error('Error during audio download:', error);
        throw new Error('Failed to download audio.');
    }
}

module.exports = {
    name: 'play',
    description: 'Plays a song by searching for it and sending the audio.',
    category: '🗂️Media',
    async execute(conn, chatId, args, senderId, msg) {
        if (!args.length) {
            return conn.sendMessage(chatId, {
                text: '🎵 Please provide a song name or YouTube link to get the song.',
                quoted: msg,
            });
        }

        const songName = args.join(' ');

        try {
            // Step 1: Search for the song using yt-search
            const searchResponse = await yts(songName);
            if (!searchResponse || !searchResponse.videos.length) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Sorry, I couldn’t find the song.',
                    quoted: msg,
                });
            }

            const firstResult = searchResponse.videos[0];
            const downloadDir = await ensureDownloadDirectory();
            const filePath = path.join(downloadDir, `${firstResult.title.replace(/\s+/g, '_')}.mp3`);

            // Step 2: Try downloading the song from an external API
            try {
                const primaryApiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${firstResult.url}`;
                const primaryApiResponse = await axios.get(primaryApiUrl);

                if (primaryApiResponse.data?.status) {
                    const data = primaryApiResponse.data.data;

                    await conn.sendMessage(chatId, {
                        text: `🎧 Fetching *${data.title}* for you. Please wait...`,
                        quoted: msg,
                    });

                    return conn.sendMessage(chatId, {
                        audio: { url: data.dl },
                        mimetype: 'audio/mp4',
                        contextInfo: {
                            externalAdReply: {
                                title: data.title,
                                body: `${firstResult.description || 'Enjoy your audio!'}`,
                                mediaType: 2,
                                thumbnailUrl: firstResult.thumbnail,
                                renderLargerThumbnail: true,
                                mediaUrl: firstResult.url,
                            },
                        },
                    });
                }
            } catch (apiError) {
                console.error('Primary API failed, switching to fallback:', apiError);
            }

            // Step 3: Fallback to downloading with youtube-dl
            await conn.sendMessage(chatId, {
                text: `🎧 Downloading *${firstResult.title}* for you. Please wait...`,
                quoted: msg,
            });

            await downloadAudio(firstResult.url, filePath);

            await conn.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                contextInfo: {
                    externalAdReply: {
                        title: firstResult.title,
                        body: 'Here is your requested audio!',
                        mediaType: 2,
                        thumbnailUrl: firstResult.thumbnail,
                        renderLargerThumbnail: true,
                        mediaUrl: firstResult.url,
                    },
                },
            });

            // Step 4: Delete the file after sending
            deleteFileWithDelay(filePath);

        } catch (error) {
            console.error('Error processing the song request:', error);
            conn.sendMessage(chatId, {
                text: '⚠️ An error occurred while processing your request.',
                quoted: msg,
            });
        }
    },
};
