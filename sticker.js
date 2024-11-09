const axios = require('axios');
const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'sticker',
    description: 'Convert an image or video to a sticker',
    category: 'Media',
    async execute(conn, chatId, msg, args) {
        const messageType = msg.message.imageMessage ? 'image' : msg.message.videoMessage ? 'video' : null;
        const caption = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';

        if (!messageType && args.length === 0) {
            await conn.sendMessage(chatId, { text: 'Please send an image or provide a URL to convert to a sticker.' });
            return;
        }

        let mediaUrl;
        if (args.length > 0 && (args[0].startsWith('http://') || args[0].startsWith('https://'))) {
            // If URL is provided as argument and starts with http or https
            mediaUrl = args[0];
        } else if (messageType) {
            // Get the media from the message if it's an image or video
            const mediaMessage = await conn.downloadMediaMessage(msg);
            mediaUrl = mediaMessage ? mediaMessage : null;
        }

        if (!mediaUrl) {
            await conn.sendMessage(chatId, { text: 'Invalid media or URL. Please provide a valid image or video URL starting with http or https, or send media directly.' });
            return;
        }

        try {
            // Create and send the sticker
            const sticker = new Sticker(mediaUrl, {
                pack: ' ', // Customize pack name
                author: 'P A I N', // Customize author name
                type: Sticker.Types.FULL,
                quality: 50
            });
            const stickerBuffer = await sticker.toBuffer();
            await conn.sendMessage(chatId, { sticker: stickerBuffer });
        } catch (error) {
            console.error('Error creating sticker:', error);
            await conn.sendMessage(chatId, { text: 'There was an error converting the media to a sticker. Please try again later.' });
        }
    }
};
