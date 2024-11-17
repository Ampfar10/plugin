const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp'); // Image processing library for converting stickers
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'toimg',
    description: 'Convert a sticker to an image.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, senderId, quotedMessage) {
        try {
            if (!quotedMessage || quotedMessage.message?.stickerMessage === undefined) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Please reply to a sticker message to convert it to an image.',
                    mentions: [senderId],
                });
            }

            // Notify the user
            const resMessage = await conn.sendMessage(chatId, {
                text: '⏳ Converting sticker to image...',
                mentions: [senderId],
            });

            // Download the sticker
            const media = await downloadMediaMessage(quotedMessage, 'buffer');
            if (!media) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Failed to download the sticker. Please try again.',
                    mentions: [senderId],
                });
            }

            // Convert the sticker to an image
            const outputDir = path.join(process.cwd(), 'temp');
            await fs.mkdir(outputDir, { recursive: true });
            const outputFile = path.join(outputDir, `${Date.now()}.png`);

            await sharp(media)
                .png()
                .toFile(outputFile);

            // Send the image
            await conn.sendMessage(chatId, {
                image: { url: outputFile },
                caption: '🖼️ Here is your image!',
                mentions: [senderId],
            });

            // Cleanup the temporary file
            await fs.unlink(outputFile);
        } catch (error) {
            console.error('Error in toimg command:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while converting the sticker. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
