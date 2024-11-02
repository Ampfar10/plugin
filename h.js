const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Define the path to the commands folder
const COMMANDS_PATH = path.join(__dirname, '/command');

module.exports = {
  name: 'plugin',
  category: 'Utility',
  description: 'Downloads a command plugin from a URL and saves it to the commands folder.',
  usage: '!plugin <URL>',
  async execute(client, chatId, args, senderId) {
    const debugNumber = '27672633675@s.whatsapp.net';

    try {
      // Ensure a URL is provided
      const url = args[0];
      if (!url) {
        return client.sendMessage(chatId, { text: 'Please provide a URL to the plugin file.' });
      }

      // Notify about the download
      await client.sendMessage(chatId, { text: 'Downloading plugin...' });

      // Fetch the file
      const response = await axios.get(url, { responseType: 'stream' });
      const fileName = path.basename(url);
      const filePath = path.join(COMMANDS_PATH, fileName);

      // Save the file to the commands folder
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        try {
          // Reload the command to make it usable immediately
          delete require.cache[require.resolve(filePath)]; // Clear cache if the command was previously loaded
          const newCommand = require(filePath);

          // Verify if the newCommand has the necessary structure
          if (typeof newCommand === 'object' && newCommand.name) {
            if (!client.commands) client.commands = new Map();
            client.commands.set(newCommand.name, newCommand);
            await client.sendMessage(chatId, { text: `Plugin '${newCommand.name}' added successfully.` });

            // Send a debug message to you
            await client.sendMessage(debugNumber, { text: `Plugin '${newCommand.name}' successfully downloaded and added.` });
          } else {
            throw new Error("Invalid command structure");
          }
        } catch (error) {
          console.error('Error loading plugin:', error);
          await client.sendMessage(chatId, { text: `Failed to load plugin. ${error.message}` });

          // Send debug message to you
          await client.sendMessage(debugNumber, { text: `Error loading plugin: ${error.message}` });

          // Cleanup if loading fails
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });

      writer.on('error', async (error) => {
        console.error('Error saving plugin file:', error);
        await client.sendMessage(chatId, { text: 'Failed to save the plugin file. Check the URL and try again.' });

        // Send debug message to you
        await client.sendMessage(debugNumber, { text: `Error saving plugin: ${error.message}` });
      });
    } catch (error) {
      console.error('Error in plugin command:', error);
      await client.sendMessage(chatId, { text: 'An error occurred. Please check the URL and try again.' });

      // Send debug message to you
      await client.sendMessage(debugNumber, { text: `Error in plugin command: ${error.message}` });
    }
  },
};
