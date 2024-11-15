const fs = require('fs');
const path = require('path');
const antilinkStatusFile = path.join(__dirname, '../data/antilinkStatus.json');

module.exports = {
    name: 'autosticker',
    description: 'Enables or disables the autosticker feature in the group.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId, isGroupAdmin) {
        const isOwner = senderId === ownerId;
        const action = args[0]?.toLowerCase();

        if (isOwner || isGroupAdmin) {
            if (action === 'on') {
                updateAutostickerStatus(chatId, true);
                await conn.sendMessage(chatId, {
                    text: '🖼️ Autosticker feature is now *enabled*. Images or videos sent will be converted to stickers automatically.',
                    mentions: [senderId]
                });
            } else if (action === 'off') {
                updateAutostickerStatus(chatId, false);
                await conn.sendMessage(chatId, {
                    text: '🖼️ Autosticker feature is now *disabled*.',
                    mentions: [senderId]
                });
            } else {
                await conn.sendMessage(chatId, {
                    text: '❗ Usage: autosticker on/off',
                    mentions: [senderId]
                });
            }
        } else {
            await conn.sendMessage(chatId, {
                text: '❌ This command is only for group admins or the bot owner.',
                mentions: [senderId]
            });
        }
    }
};

// Function to update autosticker status in the JSON file
function updateAutostickerStatus(chatId, status) {
    let settings = {};
    if (fs.existsSync(antilinkStatusFile)) {
        settings = JSON.parse(fs.readFileSync(antilinkStatusFile, 'utf-8'));
    }
    // Save both "antilink" and "autosticker" fields
    settings[chatId] = { ...settings[chatId], autosticker: status };
    fs.writeFileSync(antilinkStatusFile, JSON.stringify(settings, null, 2));
}

// Function to get autosticker status
function getAutostickerStatus(chatId) {
    if (fs.existsSync(antilinkStatusFile)) {
        const settings = JSON.parse(fs.readFileSync(antilinkStatusFile, 'utf-8'));
        return settings[chatId]?.autosticker || false;
    }
    return false;
}

module.exports.getAutostickerStatus = getAutostickerStatus;
