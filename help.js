const fs = require('fs');
const path = require('path');
const cfonts = require('cfonts');

module.exports = {
    name: 'help',
    description: 'Displays all bot commands categorized.',
    category: 'General',
    async execute(conn, chatId, args, ownerId, senderId) {
        const categorizedCommands = new Map();

        try {
            // Load commands
            const commandFiles = fs.readdirSync(path.join(__dirname, '../commands'));
            commandFiles.forEach(file => {
                const command = require(`../commands/${file}`);
                if (!categorizedCommands.has(command.category)) {
                    categorizedCommands.set(command.category, []);
                }
                categorizedCommands.get(command.category).push(command);
            });
        } catch (error) {
            console.error('Error loading commands:', error);
            await conn.sendMessage(chatId, { 
                text: '⚠️ An error occurred while loading commands. Please try again later.', 
                mentions: [senderId]
            });
            return;
        }

        // Build and style help message
        let helpMessage = '📋 *Bot Commands* 📋\n\n';
        categorizedCommands.forEach((commands, category) => {
            // Generate stylized category header
            const categoryHeader = cfonts.render(category, {
                font: 'block',         // Change font here
                align: 'left',
                colors: ['yellow'],
                background: 'transparent',
                letterSpacing: 1,
                lineHeight: 1,
            });
            
            helpMessage += `${categoryHeader.string}\n`;  // Add stylized category to help message

            // Add each command under the category with a different style
            commands.forEach(command => {
                const commandText = cfonts.render(command.name, {
                    font: 'console',  // Small font for command names
                    align: 'left',
                    colors: ['white'],
                    background: 'transparent',
                    letterSpacing: 0,
                    lineHeight: 0.5,
                });

                helpMessage += `  ${commandText.string}`; // Add stylized command
            });
            helpMessage += '\n\n';
        });

        // Send styled help message
        await conn.sendMessage(chatId, { 
            text: helpMessage.trim(), 
            mentions: [senderId]
        });
    }
};
