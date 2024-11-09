const axios = require('axios');

module.exports = {
    name: 'instagram',
    description: 'Download Instagram video from the given URL',
    category: 'Media',
    async execute(conn, chatId, args) {
        if (!args.length) {
            await conn.sendMessage(chatId, { text: 'Please provide the Instagram video URL!' });
            return;
        }

        const url = args.join(" ");
        const apiUrl = `https://weeb-api.vercel.app/insta?url=${encodeURIComponent(url)}`;

        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data.urls && data.urls.length > 0) {
                const videoUrl = data.urls.find(item => item.type === 'video').url;
                await conn.sendMessage(chatId, { text: 'Downloading video from Instagram...' });
                await conn.sendMessage(chatId, { video: { url: videoUrl }, caption: `Video by ${data.username}` });
            } else {
                await conn.sendMessage(chatId, { text: 'No video found for the provided URL. Please check the link.' });
            }
        } catch (error) {
            console.error('Error fetching Instagram video:', error);
            await conn.sendMessage(chatId, { text: 'There was an error retrieving the video. Please try again later.' });
        }
    }
};
