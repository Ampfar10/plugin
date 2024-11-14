const axios = require('axios');

module.exports = {
    name: 'view',
    description: 'View all files uploaded by the user.',
    category: 'File Management',
    async execute(conn, chatId, args, ownerId, senderId) {
        try {
            console.log(`[view command] Executing for user: ${senderId}`);
            const response = await axios.get('https://beyyo-web.onrender.com/view_bnh', {
                params: { user_id: senderId }
            });

            if (response.data.files && response.data.files.length > 0) {
                const fileList = response.data.files.join(', ');
                await conn.sendMessage(chatId, { text: `Your files: ${fileList}`, mentions: [senderId] });
            } else {
                await conn.sendMessage(chatId, { text: 'No files found.', mentions: [senderId] });
            }
        } catch (error) {
            console.error(`[view command] Error: ${error}`);
            await conn.sendMessage(chatId, { text: '⚠️ Error retrieving files. Try again later.', mentions: [senderId] });
        }
    }
};
