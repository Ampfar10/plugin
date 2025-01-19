const fetch = require('node-fetch');

const API_TOKEN = 'dop_v1_1951aa30b74e04c385bd8f02c256d80a02dabf034fbae10c7acc00aaf44ecef6';
const API_URL = 'https://api.digitalocean.com/v2/account';

module.exports = {
    name: 'digitalocean',
    description: 'Displays DigitalOcean account details.',
    category: '⚙️Utility',
    async execute(conn, chatId, args, ownerId, senderId) {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const account = data.account;

            const message = `*DigitalOcean Account Information:*\n\n` +
                            `*Email:* ${account.email}\n` +
                            `*UUID:* ${account.uuid}\n` +
                            `*Status:* ${account.status}\n` +
                            `*Email Verified:* ${account.email_verified ? 'Yes' : 'No'}\n` +
                            `*Droplet Limit:* ${account.droplet_limit}\n`;

            await conn.sendMessage(chatId, {
                text: message,
                mentions: [senderId]
            });
        } catch (error) {
            console.error('Error fetching DigitalOcean account data:', error);
            await conn.sendMessage(chatId, {
                text: '❌ Failed to retrieve DigitalOcean account details. Please try again later.',
                mentions: [senderId]
            });
        }
    }
};
