module.exports = {
    name: 'bc',
    description: 'Broadcast a message to all groups the bot is in.',
    category: '🗂️Utility',
    async execute(conn, chatId, args, senderId, msg) {
        if (!args.length) {
            return conn.sendMessage(chatId, {
                text: '❌ Please provide a message to broadcast.',
                quoted: msg,
            });
        }

        const message = args.join(' ');

        try {
            // Fetch all chats
            const allChats = await conn.groupFetchAllParticipating();
            const groupIds = Object.keys(allChats);

            if (groupIds.length === 0) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ The bot is not in any groups.',
                    quoted: msg,
                });
            }

            await conn.sendMessage(chatId, {
                text: `🔄 Broadcasting message to ${groupIds.length} groups. Please wait...`,
                quoted: msg,
            });

            for (const groupId of groupIds) {
                await conn.sendMessage(groupId, {
                    text: `📢 Broadcast message:\n\n${message}`,
                });
            }

            return conn.sendMessage(chatId, {
                text: '✅ Broadcast completed successfully!',
                quoted: msg,
            });
        } catch (error) {
            console.error('Error during broadcast:', error);
            return conn.sendMessage(chatId, {
                text: '❌ An error occurred while broadcasting the message. Please try again later.',
                quoted: msg,
            });
        }
    },
};
