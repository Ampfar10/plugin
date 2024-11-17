const axios = require('axios');

module.exports = {
    name: 'ytv',
    description: 'Plays a song by searching for it and sending the audio.',
    category: '🗂️Media',
    async execute(conn, chatId, args, senderId, msg) {
        // Check if a song name or artist is provided
        if (!args.length) {
            return conn.sendMessage(chatId, { 
                text: '🎵 Please provide a query.', 
                quoted: msg 
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
                    quoted: msg 
                });
            }

            const firstResult = searchResponse.data.data[0];

            // Inform the user the song is being processed
            await conn.sendMessage(chatId, { 
                text: `🎧 Fetching *${firstResult.title}* for you. Please wait...`,
                quoted: msg 
            });

            // Step 2: Fetch the audio file URL from the Miyan API
            const songUrl = `https://miyanapi.vercel.app/youtube?url=${encodeURIComponent(firstResult.url)}`;
            const videoResponse = await axios.get(songUrl);
            
            if (!videoResponse.data || !videoResponse.data.data || !videoResponse.data.data.video_url) {
                return conn.sendMessage(chatId, { 
                    text: '⚠️ Sorry, I couldn’t fetch the video file.', 
                    quoted: msg 
                });
            }

            const videoUrl = videoResponse.data.data.video_url; // Fixed typo

            // Step 3: Send the video with metadata
            await conn.sendMessage(chatId, {
                video: { url: videoUrl },
                caption: `🎥 Here is your video!\n\n*Title:* ${firstResult.title}\n*Description:* ${firstResult.description || 'No description available'}`,
                mimetype: 'video/mp4',
                mentions: [senderId],
                quoted: msg, // Added to quote the user's command
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
            console.error('Error fetching the video:', error);
            conn.sendMessage(chatId, { 
                text: '⚠️ An error occurred while fetching the song.', 
                mentions: [senderId],
                quoted: msg 
            });
        }
    },
};
