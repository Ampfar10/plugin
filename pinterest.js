const fetch = require('node-fetch');

module.exports = {
    name: 'pinterest',
    description: 'Searches Pinterest for images based on the query and returns results.',
    category: '🖼️ Media',
    async execute(conn, chatId, args, senderId) {
        const query = args.slice(0, -1).join(' ').trim();
        const amountArg = args[args.length - 1];
        const amount = isNaN(amountArg) ? 1 : Math.min(Math.max(Number(amountArg), 1), 10); // Default 1, max 10

        if (!query) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a search query.\n\nUsage: `pinterest <query> [amount]`',
                mentions: [senderId],
            });
        }

        await conn.sendMessage(chatId, {
            text: `🔍 Searching Pinterest for "${query}"...`,
            mentions: [senderId],
        });

        try {
            // Fetch data from the Pinterest API
            const apiUrl = `https://api.agatz.xyz/api/pinsearch?message=${encodeURIComponent(query)}`;
            const apiResponse = await fetch(apiUrl);
            const apiData = await apiResponse.json();

            if (!apiData || !apiData.data || apiData.data.length === 0) {
                throw new Error('No results found.');
            }

            // Limit results to the requested amount
            const results = apiData.data.slice(0, amount);

            // Send each image to the chat
            for (const result of results) {
                await conn.sendMessage(chatId, {
                    image: { url: result.images_url },
                    mentions: [senderId],
                });
            }

            // Notify completion
            await conn.sendMessage(chatId, {
                text: `✅ Found ${results.length} result(s) for "${query}".`,
                mentions: [senderId],
            });
        } catch (error) {
            console.error('Error searching Pinterest:', error);
            await conn.sendMessage(chatId, {
                text: '❌ Failed to fetch Pinterest results. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
