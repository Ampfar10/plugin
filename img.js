const { MessageType, Mimetype } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function handleImageCommand(msg) {
    const content = msg.body.trim();
    
    // Check if the content starts with 'data:image' (Base64 image data)
    if (content.startsWith('data:image')) {
        // Extract the Base64 string from the data URL
        const base64Data = content.split(',')[1];

        // Decode the Base64 string into binary
        const buffer = Buffer.from(base64Data, 'base64');

        // Define the file path for saving the image
        const filePath = path.join(__dirname, 'temp_image.png');

        // Save the image to a temporary file
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.error('Error writing image to file:', err);
                msg.reply('Sorry, there was an error processing the image.');
                return;
            }

            // Send the image back as a reply
            msg.reply({ 
                url: filePath, 
                mimetype: Mimetype.png 
            });
        });
    } else {
        msg.reply('Please provide a valid Base64 image string.');
    }
}

// Register the command
module.exports = {
    name: 'img',
    category: 'Utilities',
    execute: handleImageCommand
};
