const axios = require('axios');
const fs = require('fs/promises');
const f = require('fs');
const path = require('path');

module.exports = {
    name: 'play',
    description: 'Search and download a song from YouTube based on the given query.',
    category: '🗂️Media ',
    async execute(conn, chatId, args, senderId) {
        try {
            const query = args.join(' ').trim();

            if (!query) {
                return conn.sendMessage(chatId, {
                    text: '🎶 Please provide a song name or query, e.g., `!play Imagine`.',
                    mentions: [senderId],
                });
            }

            const searchApiUrl = `https://miyanapi.vercel.app/youtube?query=${encodeURIComponent(query)}`;
            const searchResponse = await axios.get(searchApiUrl);

            if (!searchResponse.data.status || searchResponse.data.data.length === 0) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ No results found for the query. Please try a different search.',
                    mentions: [senderId],
                });
            }

            const firstResult = searchResponse.data.data[0];
            const videoUrl = firstResult.url;

            if (!videoUrl) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Could not retrieve a valid video URL. Please try again.',
                    mentions: [senderId],
                });
            }

            await conn.sendMessage(chatId, {
                text: '🎵 Your song is downloading... Please wait!',
                mentions: [senderId],
            });

            const downloadApiUrl = `https://miyanapi.vercel.app/youtube?url=${encodeURIComponent(videoUrl)}`;
            const downloadResponse = await axios.get(downloadApiUrl);

            if (!downloadResponse.data.status || !downloadResponse.data.data.audio_url) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Failed to download the audio. Please try again later.',
                    mentions: [senderId],
                });
            }

            const audioUrl = downloadResponse.data.data.audio_url;
            const externalAdReplyData = {
                description: `${firstResult.title} song available now: ${firstResult.url}\n\n${firstResult.description || ''}`,
                thumbnail: firstResult.thumbnail || 'https://via.placeholder.com/300',
                title: firstResult.title,
                url: firstResult.url,
                views: firstResult.views || 'Unknown views',
            };

            const downloadDir = path.join(process.cwd(), 'downloads');
            await fs.mkdir(downloadDir, { recursive: true });
            const output = path.join(downloadDir, `${Date.now()}.m4a`);

            const audioResponse = await axios({
                method: 'get',
                url: audioUrl,
                responseType: 'stream',
            });

            const writer = f.createWriteStream(output);
            audioResponse.data.pipe(writer);

            writer.on('finish', async () => {
                await conn.sendMessage(chatId, {
                    audio: { url: output },
                    mimetype: 'audio/mp4',
                    ptt: false,
                    contextInfo: {
                        externalAdReply: {
                            title: externalAdReplyData.title,
                            body: externalAdReplyData.description,
                            mediaType: 2,
                            thumbnailUrl: externalAdReplyData.thumbnail,
                            mediaUrl: externalAdReplyData.url,
                        },
                    },
                });

                await fs.unlink(output);
            });

            writer.on('error', async () => {
                conn.sendMessage(chatId, {
                    text: '⚠️ Error downloading the audio. Please try again later.',
                    mentions: [senderId],
                });
            });

        } catch (error) {
            console.error('Error in play command:', error);
            await conn.sendMessage(chatId, {
                text: `⚠️ An error occurred: ${error.message}`,
                mentions: [senderId],
            });
        }
    },
};
