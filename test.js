module.exports = {
    name: 'test',
    description: 'A test command to verify plugin installation.',
    category: 'Utility',
    async execute(conn, chatId) {
        await conn.sendMessage(chatId, { text: '✅ Test command executed successfully!' });
    }
};
