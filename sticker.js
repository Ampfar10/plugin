const axios = require('axios');
const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'sticker',
    description: 'Convert an image or video to a sticker',
    category: 'Media',
    async execute(conn, chatId, args, msg) {
        const caption = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';

        if (!msg.message.imageMessage && !msg.message.videoMessage && args.length === 0) {
            await conn.sendMessage(chatId, { text: 'Please send an image or video with the caption "sticker" or provide a valid URL.' });
            return;
        }

        let mediaUrl;
        if (args.length > 0) {
            const url = args[0];
            if (url.startsWith('http://') || url.startsWith('https://')) {
                mediaUrl = url;
            } else {
                await conn.sendMessage(chatId, { text: 'Invalid URL. Please provide a URL starting with http or https.' });
                return;
            }
        } else {
            // Download image or video message directly if no URL was provided
            mediaUrl = await conn.downloadMediaMessage(msg);
        }

        if (!mediaUrl) {
            await conn.sendMessage(chatId, { text: 'No media found to convert. Please provide a valid URL or media.' });
            return;
        }

        try {
            await conn.sendMessage(chatId, { text: 'Converting to sticker...' });

            const sticker = new Sticker(mediaUrl, {
                pack: 'My Stickers',
                author: 'Bot',
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
