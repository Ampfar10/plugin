module.exports = {
    name: 'leave',
    description: 'Makes the bot leave the current group.',
    category: 'Group Management',
    async execute(conn, chatId, args, senderId) {
        try {
            const metadata = await conn.groupMetadata(chatId);

            // Check if the command is executed in a group
            if (!metadata) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ This command can only be used in a group.',
                    mentions: [senderId],
                });
            }

            // Confirm leave operation
            await conn.sendMessage(chatId, {
                text: '👋  Goodbye!',
                mentions: [senderId],
            });

            // Leave the group
            await conn.groupLeave(chatId);
        } catch (error) {
            console.error('Error leaving the group:', error);
            await conn.sendMessage(chatId, {
                text: '⚠️ Unable to leave the group. Ensure the command is used correctly.',
                mentions: [senderId],
            });
        }
    },
};
