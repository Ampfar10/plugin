const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Import fetch for retrieving images

module.exports = {
    name: 'help',
    description: 'Displays all bot commands categorized or shows details for a specific command.',
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

        // Check if a specific command name was provided
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            let commandDetails;

            // Search for the command in all categories
            for (let [_, commands] of categorizedCommands) {
                commandDetails = commands.find(cmd => cmd.name.toLowerCase() === commandName);
                if (commandDetails) break;
            }

            if (commandDetails) {
                // Show specific command details
                const commandInfo = `📄 *Command:* ${commandDetails.name}\n` +
                    `📝 *Description:* ${commandDetails.description || 'No description available.'}\n` +
                    `📂 *Category:* ${commandDetails.category}\n` +
                    `💡 *Usage:* ${commandDetails.usage || 'No usage info available.'}\n`;

                await conn.sendMessage(chatId, { 
                    text: commandInfo, 
                    mentions: [senderId] 
                });
            } else {
                // Command not found message
                await conn.sendMessage(chatId, { 
                    text: `⚠️ Command '${commandName}' not found. Use *help* to view all commands.`, 
                    mentions: [senderId] 
                });
            }
        } else {
            // Build help message for all commands
            let helpMessage = '🤖 *Bot Command List* 🤖\n\n';

            categorizedCommands.forEach((commands, category) => {
                helpMessage += `📂 *${category}*\n`; // Emoji for each category
                commands.forEach(command => {
                    helpMessage += `🔹*${command.name}* \n`;
                });
                helpMessage += '\n';
            });

            // Add example usage note
            helpMessage += '💡 *Example usage:* Type `help <command name>` (e.g., `help ping`).\n\n';

            // Fetch a random image URL for the help list
            const imageUrl = 'https://wallpapers.com/images/high/naruto-uzumaki-4k-cu879u0wieowwdb5.webp'; // Replace with actual image source

            // Send help message with image
            await conn.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: helpMessage.trim(),
                mentions: [senderId]
            });
        }
    }
};
