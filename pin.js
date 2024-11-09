const axios = require('axios');

module.exports = {
    name: 'pinterest',
    description: 'Download an image from Pinterest based on the given query',
    category: 'Media',
    async execute(conn, chatId, args) {
        if (!args.length) {
            await conn.sendMessage(chatId, { text: 'Please provide a query to search on Pinterest!' });
            return;
        }

        const query = args.join(" ");
        const apiUrl = `https://weeb-api.vercel.app/pinterest?query=${encodeURIComponent(query)}`;

        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data && data.original) {
                const caption = `Title: ${data.title}\nBy: ${data.pinner.name} (@${data.pinner.username})\nPinterest URL: ${data.url}`;
                await conn.sendMessage(chatId, { text: 'Downloading image from Pinterest...' });
                await conn.sendMessage(chatId, { image: { url: data.original }, caption: caption });
            } else {
                await conn.sendMessage(chatId, { text: 'No image found for the provided query. Please try a different one.' });
            }
        } catch (error) {
            console.error('Error fetching Pinterest image:', error);
            await conn.sendMessage(chatId, { text: 'There was an error retrieving the image. Please try again later.' });
        }
    }
};
