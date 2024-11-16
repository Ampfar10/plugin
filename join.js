module.exports = {
    name: 'join',
    description: 'Joins a WhatsApp group using the provided invite link.',
    category: 'Group Management',
    async execute(conn, chatId, args, senderId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, {
                text: '❓ Please provide a valid WhatsApp group link.',
                mentions: [senderId],
            });
        }

        const groupLink = args[0];
        const inviteCode = groupLink.split('/').pop(); // Extract the invite code from the link

        try {
            const response = await conn.groupAcceptInvite(inviteCode); // Join the group
            await conn.sendMessage(chatId, {
                text: `✅ Successfully joined the group: ${response.subject}`,
                mentions: [senderId],
            });
        } catch (error) {
            console.error('Error joining group:', error);
            await conn.sendMessage(chatId, {
                text: '⚠️ Unable to join the group. Ensure the link is valid and the bot has the necessary permissions.',
                mentions: [senderId],
            });
        }
    },
};
