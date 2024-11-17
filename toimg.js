const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp'); // Image processing library
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'toimg',
    description: 'Convert a sticker to an image.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, senderId, messages) {
        try {
            // Ensure a message is quoted
            const m = messages[0];
            if (!m.message || m.key.fromMe) {
                return conn.sendMessage(chatId, {
                    text: '⚠️ Please reply to a sticker message to convert it to an image.',
                    mentions: [senderId],
                });
            }
            const messageType = Object.keys(m.message)[0];
            console.debug(`[DEBUG] Message type: ${messageType}`);

            if (!m.message.stickerMessage) {
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
            console.debug('[DEBUG] Conversion message sent.');

            // Download the sticker
            const media = await downloadMediaMessage(m, 'buffer');
            if (!media) {
                console.error('[DEBUG] Failed to download sticker media.');
                return conn.sendMessage(chatId, {
                    text: '⚠️ Failed to download the sticker. Please try again.',
                    mentions: [senderId],
                });
            }
            console.debug('[DEBUG] Sticker downloaded successfully.');

            // Convert the sticker to an image
            const outputDir = path.join(process.cwd(), 'temp');
            await fs.mkdir(outputDir, { recursive: true });
            const outputFile = path.join(outputDir, `${Date.now()}.png`);

            await sharp(media)
                .png()
                .toFile(outputFile);
            console.debug(`[DEBUG] Sticker converted to image: ${outputFile}`);

            // Send the image
            await conn.sendMessage(chatId, {
                image: { url: outputFile },
                caption: '🖼️ Here is your image!',
                mentions: [senderId],
            });
            console.debug('[DEBUG] Image sent successfully.');

            // Cleanup the temporary file
            await fs.unlink(outputFile);
            console.debug('[DEBUG] Temporary file cleaned up.');
        } catch (error) {
            console.error('[DEBUG] Error in toimg command execution:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while converting the sticker. Please try again later.',
                mentions: [senderId],
            });
        }
    },
};
