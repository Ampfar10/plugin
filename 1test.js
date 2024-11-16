sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const messageType = Object.keys(m.message)[0];
    const textMessage = m.message.conversation || m.message[messageType]?.text;

    if (textMessage && textMessage.startsWith('!quote')) {
        const quotedMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quotedMessage) {
            const quotedText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;

            if (quotedText) {
                await sock.sendMessage(m.key.remoteJid, {
                    text: `Quoted Message: "${quotedText}"`
                });
            } else {
                await sock.sendMessage(m.key.remoteJid, {
                    text: "The referenced message does not contain text."
                });
            }
        } else {
            await sock.sendMessage(m.key.remoteJid, {
                text: "Please reply to a message when using the !quote command."
            });
        }
    }
});
