module.exports = {
    name: 'type',
    description: 'Identifies the type of a message or a quoted message and provides details if available.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, senderId, messages) {
        try {
            const m = messages[0]; // Get the incoming message
            if (!m.message) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ No message content detected. Please send a valid message.',
                    mentions: [senderId],
                });
            }

            // Get the type of the main message
            const messageType = Object.keys(m.message)[0];

            // Extract text content if available
            const mainText = m.message.conversation || m.message[messageType]?.text;

            // Check for quoted message
            const quotedMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

            let response = `📝 The main message is of type: *${messageType}*`;

            if (mainText) {
                response += `\n\n📖 Content: ${mainText}`;
            }

            if (quotedMessage) {
                const quotedMessageType = Object.keys(quotedMessage)[0];
                response += `\n\n🔗 Quoted Message Type: *${quotedMessageType}*`;

                const quotedText = quotedMessage[quotedMessageType]?.text || quotedMessage.conversation;
                if (quotedText) {
                    response += `\n💬 Quoted Content: ${quotedText}`;
                }
            } else {
                response += `\n\n🔗 No quoted message detected.`;
            }

            // Send response
            await conn.sendMessage(chatId, {
                text: response,
                mentions: [senderId],
            });

            // Debugging logs
            console.debug(`[DEBUG] Main message type: ${messageType}`);
            if (quotedMessage) {
                console.debug(`[DEBUG] Quoted message type: ${Object.keys(quotedMessage)[0]}`);
            }
        } catch (error) {
            console.error('[DEBUG] Error in type command execution:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while checking the message type. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
