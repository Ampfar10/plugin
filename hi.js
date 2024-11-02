module.exports = {
  name: 'hi',
  category: 'General',
  description: 'Responds with a greeting including the user’s name.',
  async execute(client, chatId, args, senderId) {
    try {
      // Extract the user's name from the senderId
      const userName = senderId.split('@')[0];

      // Send the greeting message
      await client.sendMessage(chatId, { text: `Hello, ${userName}!` });
    } catch (error) {
      console.error('Error in hi command:', error);
      await client.sendMessage(chatId, { text: 'An error occurred while processing the command.' });
    }
  },
};

