module.exports = {
    name: 'kick',
    description: 'Kicks a tagged user after a specified amount of seconds with a countdown.',
    category: 'Group',
    async execute(conn, chatId, args) {
        try {
            if (args.length < 2) {
                await conn.sendMessage(chatId, { text: 'Please provide a user and the number of seconds before kicking them.' });
                return;
            }

            const mentionedUser = args[0].replace('@', '');  // Remove '@' from the mention
            const seconds = parseInt(args[1]);

            if (isNaN(seconds) || seconds <= 0) {
                await conn.sendMessage(chatId, { text: 'Please provide a valid number of seconds.' });
                return;
            }

            // Send a confirmation message
            await conn.sendMessage(chatId, { text: `User @${mentionedUser} will be kicked in ${seconds} seconds.` });

            // Countdown for the last 5 seconds
            const countdownStart = seconds - 5;
            if (countdownStart > 0) {
                await new Promise(resolve => setTimeout(resolve, countdownStart * 1000));
            }

            // Countdown from 5 seconds
            for (let i = 5; i > 0; i--) {
                await conn.sendMessage(chatId, { text: `${i}` });
                await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second before the next countdown
            }

            // Final message and kick
            await conn.sendMessage(chatId, { text: `Goodbye @${mentionedUser}` });

            // Remove user from group
            await conn.groupParticipantsUpdate(chatId, [mentionedUser], 'remove');

        } catch (error) {
            console.error('Error executing kick command:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while executing the command.' });
        }
    }
};
