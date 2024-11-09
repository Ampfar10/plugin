const axios = require('axios');

module.exports = {
    name: 'pinterest',
    description: 'Get images from Pinterest based on the given query',
    category: 'Media',
    async execute(conn, chatId, args) {
        if (!args.length) {
            await conn.sendMessage(chatId, { text: 'Please provide a search query!' });
            return;
        }

        // Extract query and amount from args
        const query = args.slice(0, -1).join(" ");
        let amount = parseInt(args[args.length - 1]);

        // Validate if the last argument is a number (amount) or part of the query
        if (isNaN(amount)) {
            amount = 1; // default to 1 if no valid amount is given
        } else if (amount > 10) {
            amount = 10; // maximum limit of 10
        }

        const apiUrl = `https://weeb-api.vercel.app/pinterest?query=${encodeURIComponent(query)}`;

        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data.length > 0) {
                const imagesToSend = data.slice(0, amount);

                // Notify user about the images being sent
                await conn.sendMessage(chatId, { text: `Found ${imagesToSend.length} images for "${query}":` });

                // Send each image with details
                for (const imageData of imagesToSend) {
                    await conn.sendMessage(chatId, {
                        image: { url: imageData.imageUrl }
                       // caption: `Title: ${imageData.title}\nBy: ${imageData.pinner.name} (@${imageData.pinner.username})`
                    });
                }
            } else {
                await conn.sendMessage(chatId, { text: 'No images found for the provided query. Please try a different search term.' });
            }
        } catch (error) {
            console.error('Error fetching Pinterest images:', error);
            await conn.sendMessage(chatId, { text: 'There was an error retrieving images. Please try again later.' });
        }
    }
};
