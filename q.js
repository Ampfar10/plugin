module.exports = {
    name: 'quote',
    description: 'Quotes a replied message in various formats (text, image, video, sticker, etc.).',
    category: '⛩️General',
    async execute(conn, m) {
        const quotedMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quotedMessage) {
            const quotedMessageType = Object.keys(quotedMessage)[0];

            if (quotedMessageType === 'conversation' || quotedMessageType === 'extendedTextMessage') {
                const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
                if (quotedText) {
                    await conn.sendMessage(m.key.remoteJid, {
                        text: `Quoted Text: "${quotedText}"`
                    });
                }
            } else if (quotedMessageType === 'imageMessage') {
                const caption = quotedMessage.imageMessage?.caption || 'No caption';
                const imageBuffer = await sock.downloadMediaMessage(quotedMessage.imageMessage);
                await conn.sendMessage(m.key.remoteJid, {
                    text: `Quoted Image Caption: "${caption}"`,
                    image: imageBuffer,
                });
            } else if (quotedMessageType === 'videoMessage') {
                const caption = quotedMessage.videoMessage?.caption || 'No caption';
                const videoBuffer = await sock.downloadMediaMessage(quotedMessage.videoMessage);
                await conn.sendMessage(m.key.remoteJid, {
                    text: `Quoted Video Caption: "${caption}"`,
                    video: videoBuffer,
                });
            } else if (quotedMessageType === 'stickerMessage') {
                const stickerBuffer = await sock.downloadMediaMessage(quotedMessage.stickerMessage);
                await conn.sendMessage(m.key.remoteJid, {
                    text: "Quoted Sticker",
                    sticker: stickerBuffer,
                });
            } else if (quotedMessageType === 'viewOnceMessage') {
                const viewOnceContent = quotedMessage.viewOnceMessage?.message;
                const viewOnceType = Object.keys(viewOnceContent || {})[0];

                if (viewOnceType === 'imageMessage') {
                    const caption = viewOnceContent.imageMessage?.caption || 'No caption';
                    const imageBuffer = await sock.downloadMediaMessage(viewOnceContent.imageMessage);
                    await conn.sendMessage(m.key.remoteJid, {
                        text: `Quoted View-Once Image Caption: "${caption}"`,
                        image: imageBuffer,
                    });
                } else if (viewOnceType === 'videoMessage') {
                    const caption = viewOnceContent.videoMessage?.caption || 'No caption';
                    const videoBuffer = await sock.downloadMediaMessage(viewOnceContent.videoMessage);
                    await conn.sendMessage(m.key.remoteJid, {
                        text: `Quoted View-Once Video Caption: "${caption}"`,
                        video: videoBuffer,
                    });
                } else {
                    await conn.sendMessage(m.key.remoteJid, {
                        text: "Quoted View-Once Message: Unsupported type.",
                    });
                }
            } else {
                await conn.sendMessage(m.key.remoteJid, {
                    text: "Unsupported message type for quoting.",
                });
            }
        } else {
            await conn.sendMessage(m.key.remoteJid, {
                text: "Please reply to a message when using the !quote command."
            });
        }
    }
};
