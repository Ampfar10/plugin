const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    description: 'Displays all bot commands categorized.',
    category: 'General',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Map to store commands by category
        const categorizedCommands = new Map();

        try {
            // Scan the commands folder and load commands
            const commandFiles = fs.readdirSync(path.join(__dirname, '../commands'));

            commandFiles.forEach(file => {
                const command = require(`../commands/${file}`);
                
                // Group commands by category
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

        // Build help message with different fonts
        let helpMessage = '📋 *Bot Commands* 📋\n\n';

        categorizedCommands.forEach((commands, category) => {
            // Font for category (Ｆｏｎｔ　１ style)
            helpMessage += `＃ ${category.replace(/[A-Za-z]/g, c => 
                String.fromCharCode(c.charCodeAt(0) + 0xFF00 - 0x20))}\n`;
            
            commands.forEach(command => {
                // Font for command name (𝙵𝚘𝚗𝚝 𝟸 style)
                const styledCommandName = command.name.replace(/[A-Za-z0-9]/g, c => 
                    String.fromCharCode(c.charCodeAt(0) + (/[0-9]/.test(c) ? 0x1D7EC - 0x30 : 0x1D670 - 0x41))
                );
                helpMessage += `∘ ${styledCommandName}, `;
            });
            helpMessage += '\n\n';
        });

        // Send help message
        await conn.sendMessage(chatId, { 
            text: helpMessage.trim(),  // Trim to remove the last new line
            mentions: [senderId]
        });
    }
};
