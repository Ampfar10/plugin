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

            // Validate the phone number format (digits only, no special characters or spaces)
            const validPhoneNumber = phoneNumber.match(/^\d{10,15}$/);
            if (!validPhoneNumber) {
                await conn.sendMessage(chatId, { text: 'Please provide a valid phone number (digits only, no spaces or special characters).' });
                return;
            }

            // Try to add the user to the group
            try {
                await conn.groupAdd(chatId, [phoneNumber]);
                await conn.sendMessage(chatId, { text: `User with number ${phoneNumber} has been added to the group!` });
            } catch (error) {
                // If adding fails, send the invite link
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
