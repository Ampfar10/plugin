const qrcode = require('qrcode');

module.exports = {
    name: 'qr',
    description: 'Converts text to a QR code.',
    category: 'Utility',
    async execute(conn, chatId, args) {
        try {
            // Get the text input from the command arguments
            const text = args.join(" ");
            
            if (!text) {
                await conn.sendMessage(chatId, { text: 'Please provide the text to convert to a QR code.' });
                return;
            }

            // Generate the QR code from the provided text
            qrcode.toDataURL(text, async (err, url) => {
                if (err) {
                    console.error('Error generating QR code:', err);
                    await conn.sendMessage(chatId, { text: 'An error occurred while generating the QR code.' });
                    return;
                }

                // Send the QR code image to the user
                await conn.sendMessage(chatId, { image: { url: url }, caption: 'Here is your QR code!' });
            });
        } catch (error) {
            console.error('Error in qr command:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while processing your request.' });
        }
    }
};
