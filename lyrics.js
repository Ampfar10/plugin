const axios = require('axios');

module.exports = {
    name: 'lyrics',
    description: 'Get the lyrics of a song with details',
    category: 'Media',
    async execute(conn, chatId, args) {
        if (!args.length) {
            await conn.sendMessage(chatId, { text: 'Please provide a song title or lyrics snippet!' });
            return;
        }

        const term = args.join(" ");
        const apiUrl = `https://weeb-api.vercel.app/genius?query=${encodeURIComponent(term)}`;

        try {
            const response = await axios.get(apiUrl);
            const lyricsData = response.data;

            if (lyricsData.lyrics) {
                const caption = `*Title:* ${lyricsData.title}\n*Full Title:* ${lyricsData.fullTitle}\n*Artist:* ${lyricsData.artist}\n\n${lyricsData.lyrics.slice(0, 4096)}`;
                
                await conn.sendMessage(chatId, {
                    image: { url: lyricsData.image },
                    caption: caption
                });
            } else {
                await conn.sendMessage(chatId, { text: 'Lyrics not found for the given query.' });
            }
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            await conn.sendMessage(chatId, { text: 'There was an error retrieving the lyrics. Please try again later.' });
        }
    }
};
