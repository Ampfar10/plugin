const TruecallerJS = require('truecallerjs');

module.exports = {
    name: 'trucaller',
    description: 'Fetch details for a phone number, including name if available.',
    category: 'Utilities',
    async execute(conn, chatId, args) {
        if (args.length === 0) {
            await conn.sendMessage(chatId, { text: 'Please provide a phone number. Usage: trucaller <phone_number>' });
            return;
        }

        const phoneNumber = args[0];

        // Function to determine country code based on phone number
        const getCountryCode = (number) => {
            if (number.startsWith('+')) return number.slice(1, 3); // Extract country code from number if present
            return 'ZA'; // Default to South Africa if no code is provided
        };

        const searchData = {
            number: phoneNumber,
            countryCode: getCountryCode(phoneNumber),
            installationId: 'a1k07--Vgdfyvv_rftf5uuudhuhnkljyvvtfftjuhbuijbhug'
        };

        try {
            const result = await TruecallerJS.searchNumber(searchData);
            if (result && result.data && result.data[0]) {
                const contact = result.data[0];
                const message = `*Phone Number Information:*\n\n` +
                                `Name: ${contact.name || 'N/A'}\n` +
                                `Phone: ${contact.number || 'N/A'}\n` +
                                `Country: ${contact.countryCode || 'N/A'}\n` +
                                `Location: ${contact.address || 'N/A'}\n` +
                                `Carrier: ${contact.carrier || 'N/A'}\n` +
                                `Type: ${contact.type || 'N/A'}`;

                await conn.sendMessage(chatId, { text: message });
            } else {
                await conn.sendMessage(chatId, { text: `No information found for the number: ${phoneNumber}` });
            }
        } catch (error) {
            console.error('Error fetching phone number details:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while fetching the phone number details. Please try again later.' });
        }
    }
};
