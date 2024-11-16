const axios = require('axios');

module.exports = {
    name: 'play',
    description: 'Plays a song by searching for it and sending the audio.',
    category: '🎵 Music',
    async execute(conn, chatId, args, senderId) {
        // Check if a song name or artist is provided
        if (!args.length) {
            return conn.sendMessage(chatId, { 
                text: '🎵 Please provide a song name or artist to search.', 
                mentions: [senderId] 
            });
        }

        const songName = args.join(' ');

        try {
            // Step 1: Search for the song using the Miyan API
            const searchApiUrl = `https://miyanapi.vercel.app/youtube?query=${encodeURIComponent(songName)}`;
            const searchResponse = await axios.get(searchApiUrl);

            if (!searchResponse.data || !searchResponse.data.data || !searchResponse.data.data.length) {
                return conn.sendMessage(chatId, { 
                    text: '⚠️ Sorry, I couldn’t find the song.', 
                    mentions: [senderId] 
                });
            }

            const firstResult = searchResponse.data.data[0];

            // Inform the user the song is being processed
            await conn.sendMessage(chatId, { 
                text: `🎧 Fetching *${firstResult.title}* for you. Please wait...`, 
                mentions: [senderId] 
            });

            // Step 2: Fetch the audio file URL from the Miyan API
            const songUrl = `https://miyanapi.vercel.app/youtube?url=${encodeURIComponent(firstResult.url)}`;
            const songResponse = await axios.get(songUrl);

            if (!songResponse.data || !songResponse.data.data || !songResponse.data.data.audio_url) {
                return conn.sendMessage(chatId, { 
                    text: '⚠️ Sorry, I couldn’t fetch the audio file.', 
                    mentions: [senderId] 
                });
            }

            const audioUrl = songResponse.data.data.audio_url;

            // Step 3: Send the audio with metadata
            await conn.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mp4',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: firstResult.title,
                        body: `${firstResult.description || 'No description available'}`,
                        mediaType: 2, // Media type for a YouTube video
                        thumbnailUrl: firstResult.thumbnail,
                        renderLargerThumbnail: true,
                        mediaUrl: firstResult.url,
                    },
                },
            });

        } catch (error) {
            console.error('Error fetching the song:', error);
            conn.sendMessage(chatId, { 
                text: '⚠️ An error occurred while fetching the song.', 
                mentions: [senderId] 
            });
        }
    },
};
