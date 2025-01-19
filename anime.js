const fetch = require('node-fetch');

module.exports = {
    name: 'anime',
    description: 'Get information about an anime.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, ownerId, senderId) {
        if (!args.length) {
            await conn.sendMessage(chatId, { 
                text: '❌ Please provide the name of the anime you want to search for.', 
                mentions: [senderId] 
            });
            return;
        }

        const query = args.join(' ').trim();
        const apiUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const data = await response.json();
            const anime = data.data[0];

            if (!anime) {
                await conn.sendMessage(chatId, { 
                    text: `❌ No results found for "${query}".`, 
                    mentions: [senderId] 
                });
                return;
            }

            const message = `*Anime Information:*\n\n` +
                            `*Title:* ${anime.title}\n` +
                            `*Japanese Title:* ${anime.title_japanese}\n` +
                            `*Episodes:* ${anime.episodes || 'N/A'}\n` +
                            `*Status:* ${anime.status}\n` +
                            `*Score:* ${anime.score}\n` +
                            `*Synopsis:* ${anime.synopsis || 'No synopsis available.'}\n` +
                            `*Link:* ${anime.url}`;

            await conn.sendMessage(chatId, { 
                text: message, 
                mentions: [senderId] 
            });
        } catch (error) {
            console.error('Error fetching anime data:', error);
            await conn.sendMessage(chatId, { 
                text: '❌ Failed to retrieve anime information. Please try again later.', 
                mentions: [senderId] 
            });
        }
    },
};
