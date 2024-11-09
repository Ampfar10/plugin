const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'img',
    description: 'Converts raw binary or Base64 text to an image and sends it',
    category: 'Utility',
    async execute(conn, chatId, args) {
        try {
            if (!args || args.length === 0) {
                await conn.sendMessage(chatId, { text: 'Please provide the binary or Base64 image data.' });
                return;
            }

            // Join the parts of the argument to handle multi-word binary/Base64 input
            const inputData = args.join(" ").trim();

            // Check if the input is Base64 encoded
            let binaryData;
            if (inputData.startsWith('data:image')) {
                // Extract Base64 data from data URL (image data URI)
                const base64Data = inputData.split(',')[1]; // Remove the data URL prefix
                binaryData = Buffer.from(base64Data, 'base64');
            } else {
                // If not Base64, treat it as raw binary
                binaryData = Buffer.from(inputData, 'binary');
            }

            // Define the file path for the image
            const filePath = path.join(__dirname, 'image.png');

            // Write the binary data to a PNG file
            fs.writeFileSync(filePath, binaryData);

            // Send the image file
            await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'Here is your image!' });

            // Clean up the file after sending
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error converting binary/Base64 data to image:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while converting the data to an image.' });
        }
    }
};
