const axios = require('axios');

module.exports = {
    name: 'delete',
    description: 'Delete a specific file uploaded by the user.',
    category: 'File Management',
    async execute(conn, chatId, args, ownerId, senderId) {
        const filename = args[0];
        if (!filename) {
            await conn.sendMessage(chatId, { text: 'Please provide the filename to delete.', mentions: [senderId] });
            return;
        }

        try {
            console.log(`[delete command] Executing for user: ${senderId}, filename: ${filename}`);
            const response = await axios.delete(`https://beyyo-web.onrender.com/delete_bnh/${filename}`, {
                params: { user_id: senderId }
            });

            await conn.sendMessage(chatId, { text: `${filename} has been deleted successfully.`, mentions: [senderId] });
        } catch (error) {
            console.error(`[delete command] Error: ${error}`);
            await conn.sendMessage(chatId, { text: `⚠️ Could not delete ${filename}. Check if the file exists.`, mentions: [senderId] });
        }
    }
};
