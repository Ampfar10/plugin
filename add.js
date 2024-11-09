module.exports = {
    name: 'add',
    description: 'Add a user to the group by their phone number.',
    category: 'Group',
    async execute(conn, chatId, args) {
        try {
            if (!args || args.length === 0) {
                await conn.sendMessage(chatId, { text: 'Please provide the phone number to add.' });
                return;
            }

            const phoneNumber = args[0];
            if (!phoneNumber.match(/^\d{11,15}$/)) {
                await conn.sendMessage(chatId, { text: 'Please provide a valid phone number.' });
                return;
            }

            // Try to add the user to the group
            try {
                await conn.groupAdd(chatId, [phoneNumber + '@s.whatsapp.net']);
                await conn.sendMessage(chatId, { text: `User with number ${phoneNumber} has been added to the group!` });
            } catch (error) {
                // If adding fails, send the invite link instead
                console.error('Error adding user:', error);
                const inviteLink = await conn.groupInviteCode(chatId);
                await conn.sendMessage(chatId, { text: `I couldn't add the user. Here's the invite link: https://chat.whatsapp.com/${inviteLink}` });
            }
        } catch (error) {
            console.error('Error executing add command:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while adding the user.' });
        }
    }
};
