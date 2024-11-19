const fs = require('fs/promises'); // For saving files
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'quote',
    description: 'Quotes text or media from a replied message.',
    category: 'Owner',
    async execute(conn, chatId, args, ownerId, senderId, message) {
        // Check if the message is a reply
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const quotedMessageType = Object.keys(quotedMessage)[0];

        try {
            if (quotedMessageType === 'conversation' || quotedMessageType === 'extendedTextMessage') {
                // Handle quoted text
                const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
                return await conn.sendMessage(chatId, {
                    text: `📜 Quoted Message: "${quotedText}"`,
                    mentions: [senderId],
                });
            } else if (quotedMessageType === 'imageMessage') {
                // Handle quoted image
                const imageBuffer = await downloadMediaMessage(
                    { message: { imageMessage: quotedMessage.imageMessage }, key: message.key },
                    'buffer',
                    {},
                    {
                        logger: console,
                        reuploadRequest: conn.updateMediaMessage,
                    }
                );

                // Optional: Save the image locally (for debug or reuse)
                const filePath = path.join(__dirname, 'quoted-image.jpeg');
                await fs.writeFile(filePath, imageBuffer);

                return await conn.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: "📜 Here's the quoted image.",
                    mentions: [senderId],
                });
            } else if (quotedMessageType === 'videoMessage') {
                // Handle quoted video
                const videoBuffer = await downloadMediaMessage(
                    { message: { videoMessage: quotedMessage.videoMessage }, key: message.key },
                    'buffer',
                    {},
                    {
                        logger: console,
                        reuploadRequest: conn.updateMediaMessage,
                    }
                );

                return await conn.sendMessage(chatId, {
                    video: videoBuffer,
                    caption: "📜 Here's the quoted video.",
                    mentions: [senderId],
                });
            } else {
                // Unsupported message type
                return await conn.sendMessage(chatId, {
                    text: "❌ This type of quoted message is not supported.",
                    mentions: [senderId],
                });
            }
        } catch (error) {
            console.error('Error processing quoted message:', error);
            return await conn.sendMessage(chatId, {
                text: "❌ An error occurred while processing the quoted message.",
                mentions: [senderId],
            });
        }
    },
};
