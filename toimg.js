const fs = require('fs');
const path = require('path');
const toimgStatusFile = path.join(__dirname, '../data/antilinkStatus.json');

module.exports = {
    name: 'toimg',
    description: 'Enables or disables the toimg feature in the group.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, senderId) {
        const action = args[0]?.toLowerCase();

        if (action === 'on') {
            updateToimgStatus(chatId, true);
            await conn.sendMessage(chatId, {
                text: '🖼️ Toimg feature is now *enabled*. Stickers will be converted to images automatically.',
                mentions: [senderId],
            });
        } else if (action === 'off') {
            updateToimgStatus(chatId, false);
            await conn.sendMessage(chatId, {
                text: '🖼️ Toimg feature is now *disabled*.',
                mentions: [senderId],
            });
        } else {
            await conn.sendMessage(chatId, {
                text: '❗ Usage: toimg on/off',
                mentions: [senderId],
            });
        }
    },
};

// Function to update toimg status in the JSON file
function updateToimgStatus(chatId, status) {
    let settings = {};
    if (fs.existsSync(toimgStatusFile)) {
        settings = JSON.parse(fs.readFileSync(toimgStatusFile, 'utf-8'));
    }
    settings[chatId] = { ...settings[chatId], toimg: status };
    fs.writeFileSync(toimgStatusFile, JSON.stringify(settings, null, 2));
}

// Function to get toimg status
function getToimgStatus(chatId) {
    if (fs.existsSync(toimgStatusFile)) {
        const settings = JSON.parse(fs.readFileSync(toimgStatusFile, 'utf-8'));
        return settings[chatId]?.toimg || false;
    }
    return false;
}

module.exports.getToimgStatus = getToimgStatus;



