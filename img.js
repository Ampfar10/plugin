const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'img',
    description: 'Converts raw binary text to an image and sends it',
    category: 'Utility',
    async execute(conn, chatId, args) {
        try {
            if (!args || args.length === 0) {
                await conn.sendMessage(chatId, { text: 'Please provide the binary image data.' });
                return;
            }

            // Convert the raw binary string to a Buffer
            const binaryString = args.join(" ");
            const binaryData = Buffer.from(binaryString, 'binary');

            // Define file path for the image
            const filePath = path.join(__dirname, 'image.png');

            // Write the binary data to a PNG file
            fs.writeFileSync(filePath, binaryData);

            // Send the image file
            await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'Here is your image!' });

            // Clean up the file after sending
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error converting binary data to image:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while converting the data to an image.' });
        }
    }
};
