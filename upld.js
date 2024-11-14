const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'upload',
    description: 'Uploads a file to the server and returns the URL.',
    category: 'File Management',
    async execute(conn, chatId, args, ownerId, senderId) {
        const fileName = args[0];

        if (!fileName) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ Please specify a file to upload.', 
                mentions: [senderId]
            });
            return;
        }

        // Ensure the file exists
        const filePath = path.join(__dirname, '../files', fileName);
        if (!fs.existsSync(filePath)) {
            await conn.sendMessage(chatId, { 
                text: `⚠️ File ${fileName} does not exist.`, 
                mentions: [senderId]
            });
            return;
        }

        try {
            // Prepare the form data for the POST request
            const form = new FormData();
            form.append('user_id', senderId);  // Use the sender's ID as user_id
            form.append('file', fs.createReadStream(filePath));

            // Send the POST request to upload
            await axios.post('https://beyyo-web.onrender.com/upload_bnh', form, {
                headers: form.getHeaders(),
            });

            // Build the URL for the uploaded file
            const fileUrl = `https://beyyo-web.onrender.com/uploads/${senderId}/${fileName}`;

            // Notify the user of the success and send the URL
            await conn.sendMessage(chatId, { 
                text: `✅ File ${fileName} uploaded successfully! Here’s the URL: ${fileUrl}`, 
                mentions: [senderId]
            });
        } catch (error) {
            console.error('[upload command] Error uploading file:', error);
            await conn.sendMessage(chatId, { 
                text: `⚠️ Error uploading ${fileName}. Please try again later.`, 
                mentions: [senderId]
            });
        }
    }
};
