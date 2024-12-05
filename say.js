module.exports = {
    name: 'say',
    description: 'The bot will repeat the message you provide.',
    category: '📢 Utility',
    async execute(conn, chatId, args, senderId) {
        const message = args.join(' ').trim();

        if (!message) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a message for me to repeat.\n\nUsage: `!say <message>`',
                mentions: [senderId],
            });
        }

        try {
            await conn.sendMessage(chatId, {
                text: message,
                mentions: [senderId],
            });

            console.log(`Bot repeated message: "${message}" in chat: ${chatId}`);
        } catch (error) {
            console.error('Error in say command:', error);
            await conn.sendMessage(chatId, {
                text: '❌ There was an error processing your request. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
