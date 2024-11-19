const fs = require('fs').promises; // For saving files
import { downloadMediaMessage } from '@whiskeysockets/baileys';

module.exports = {
    name: 'quote',
    description: 'Quotes text or media from a replied message',
    category: 'Owner',
    async execute(conn, chatId, args, senderId, message) {
        // Ensure the message is a reply
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quotedMessage) {
            const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
            const quotedImage = quotedMessage.imageMessage;

            if (quotedText) {
                // Handle quoted text
                await conn.sendMessage(chatId, { 
                    text: `Quoted Message: "${quotedText}"`, 
                    mentions: [senderId] 
                });
            } else if (quotedImage) {
                try {
                    // Handle quoted image
                    const buffer = await downloadMediaMessage(
                        { message: { imageMessage: quotedImage }, key: message.key },
                        'buffer',
                        {},
                        {
                            logger: console,
                            reuploadRequest: conn.updateMediaMessage
                        }
                    );

                    // Save the media file locally
                    const filePath = './quoted-image.jpeg';
                    await fs.writeFile(filePath, buffer);

                    // Send the image back to the chat with a custom caption
                    await conn.sendMessage(chatId, {
                        image: { buffer },
                        caption: "Here's the quoted image.",
                        mentions: [senderId]
                    });
                } catch (err) {
                    console.error("Failed to download or process the image:", err);
                    await conn.sendMessage(chatId, { 
                        text: "There was an error processing the quoted image.", 
                        mentions: [senderId] 
                    });
                }
            } else {
                // If no text or image is found
                await conn.sendMessage(chatId, { 
                    text: "The referenced message does not contain text or an image.", 
                    mentions: [senderId] 
                });
            }
        } else {
            // If no message was replied to
            await conn.sendMessage(chatId, { 
                text: "Please reply to a message when using the quote command.", 
                mentions: [senderId] 
            });
        }
    },
};
