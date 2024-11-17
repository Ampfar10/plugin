module.exports = {
    name: 'type',
    description: 'Identifies the type of a quoted message.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, senderId, messages) {
        try {
            // Ensure a message is quoted
            const m = messages[0];
            if (!m.message || m.key.fromMe) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Please reply to a message to check its type.',
                    mentions: [senderId],
                });
            }

            // Get the type of the quoted message
            const messageType = Object.keys(m.message)[0];

            // Notify the user of the message type
            await conn.sendMessage(chatId, {
                text: `📝 The quoted message is of type: *${messageType}*`,
                mentions: [senderId],
            });

            console.debug(`[DEBUG] Quoted message type: ${messageType}`);
        } catch (error) {
            console.error('[DEBUG] Error in type command execution:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while checking the message type. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
