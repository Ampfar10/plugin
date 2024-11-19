const fs = require('fs/promises');
const path = require('path');

module.exports = {
    name: 'quote',
    description: 'Reply to a message to quote it in the chat.',
    category: '⛩️General',
    async execute(conn, chatId, args, senderId, messages) {
        const msg = messages[0];
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const quotedMessageType = Object.keys(quotedMessage || {})[0];

        try {
            if (!quotedMessageType) {
                return await conn.sendMessage(chatId, {
                    text: "❌ Please reply to a message to quote it.",
                    mentions: [senderId],
                });
            }

            if (quotedMessageType === 'conversation' || quotedMessageType === 'extendedTextMessage') {
                const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
                await conn.sendMessage(chatId, {
                    text: `📜 Quoted Text: "${quotedText}"`,
                    mentions: [msg.key.participant || senderId],
                });
            } else if (quotedMessageType === 'imageMessage') {
                const caption = quotedMessage.imageMessage?.caption || 'No caption';
                const imageBuffer = await conn.downloadMediaMessage(quotedMessage.imageMessage);
                await conn.sendMessage(chatId, {
                    text: `📜 Quoted Image Caption: "${caption}"`,
                    image: imageBuffer,
                    mentions: [msg.key.participant || senderId],
                });
            } else if (quotedMessageType === 'videoMessage') {
                const caption = quotedMessage.videoMessage?.caption || 'No caption';
                const videoBuffer = await conn.downloadMediaMessage(quotedMessage.videoMessage);
                await conn.sendMessage(chatId, {
                    text: `📜 Quoted Video Caption: "${caption}"`,
                    video: videoBuffer,
                    mentions: [msg.key.participant || senderId],
                });
            } else if (quotedMessageType === 'stickerMessage') {
                const stickerBuffer = await conn.downloadMediaMessage(quotedMessage.stickerMessage);
                await conn.sendMessage(chatId, {
                    text: "📜 Quoted Sticker:",
                    sticker: stickerBuffer,
                    mentions: [msg.key.participant || senderId],
                });
            } else if (quotedMessageType === 'viewOnceMessage') {
                const viewOnceContent = quotedMessage.viewOnceMessage?.message;
                const viewOnceType = Object.keys(viewOnceContent || {})[0];

                if (viewOnceType === 'imageMessage') {
                    const caption = viewOnceContent.imageMessage?.caption || 'No caption';
                    const imageBuffer = await conn.downloadMediaMessage(viewOnceContent.imageMessage);
                    await conn.sendMessage(chatId, {
                        text: `📜 Quoted View-Once Image Caption: "${caption}"`,
                        image: imageBuffer,
                        mentions: [msg.key.participant || senderId],
                    });
                } else if (viewOnceType === 'videoMessage') {
                    const caption = viewOnceContent.videoMessage?.caption || 'No caption';
                    const videoBuffer = await conn.downloadMediaMessage(viewOnceContent.videoMessage);
                    await conn.sendMessage(chatId, {
                        text: `📜 Quoted View-Once Video Caption: "${caption}"`,
                        video: videoBuffer,
                        mentions: [msg.key.participant || senderId],
                    });
                } else {
                    await conn.sendMessage(chatId, {
                        text: "❌ Unsupported view-once message type.",
                        mentions: [msg.key.participant || senderId],
                    });
                }
            } else {
                await conn.sendMessage(chatId, {
                    text: "❌ Unsupported message type for quoting.",
                    mentions: [msg.key.participant || senderId],
                });
            }
        } catch (error) {
            console.error('Error in quote command:', error);
            await conn.sendMessage(chatId, {
                text: "❌ An error occurred while quoting the message.",
                mentions: [msg.key.participant || senderId],
            });
        }
    },
};
