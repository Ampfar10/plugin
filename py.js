const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: 'python',
    description: 'Executes the provided Python code and returns the output. Handles input() statements interactively.',
    category: 'Programming',
    async execute(conn, chatId, args, ownerId, senderId, msg) {
        console.debug(`[python command] Executing command for user: ${senderId} with args:`, args);

        if (!args.length) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ Please provide Python code to execute.', 
                mentions: [senderId]
            });
            return;
        }

        let code = args.join(' ');
        
        // Check for any `input()` statements and handle them
        let inputRequests = [];
        const inputRegex = /input\(["']([^"']+)["']\)/g;
        let match;
        while ((match = inputRegex.exec(code)) !== null) {
            inputRequests.push(match[1]); // Store prompt message
        }

        if (inputRequests.length > 0) {
            // If inputs are required, prompt user for each input
            await conn.sendMessage(chatId, { 
                text: `💡 Your code requires ${inputRequests.length} input(s). Please respond with answers in this format:\n*python input* answer1, answer2, ...`,
                mentions: [senderId]
            });
            
            // Wait for user's input responses
            conn.on('message', async responseMsg => {
                if (responseMsg.body.startsWith('python input')) {
                    const inputs = responseMsg.body.replace('python input ', '').split(',').map(str => str.trim());

                    if (inputs.length !== inputRequests.length) {
                        await conn.sendMessage(chatId, { 
                            text: `⚠️ Expected ${inputRequests.length} inputs, but received ${inputs.length}. Try again.`,
                            mentions: [senderId]
                        });
                        return;
                    }

                    // Replace each input() prompt in code with user's response
                    inputRequests.forEach((prompt, index) => {
                        code = code.replace(`input("${prompt}")`, `"${inputs[index]}"`);
                    });

                    // Write modified code with inputs to a temporary Python file
                    const filePath = path.join(__dirname, 'temp_code.py');
                    fs.writeFileSync(filePath, code);

                    // Execute the Python code
                    exec(`python3 ${filePath}`, async (error, stdout, stderr) => {
                        if (error) {
                            console.error(`[python command] Execution error:`, error);
                            await conn.sendMessage(chatId, { 
                                text: `⚠️ Error executing Python code: ${error.message}`, 
                                mentions: [senderId]
                            });
                        } else if (stderr) {
                            console.debug(`[python command] Stderr:`, stderr);
                            await conn.sendMessage(chatId, { 
                                text: `⚠️ Python error: ${stderr}`, 
                                mentions: [senderId]
                            });
                        } else {
                            console.debug(`[python command] Execution result:`, stdout);
                            await conn.sendMessage(chatId, { 
                                text: `📄 Output:\n${stdout}`, 
                                mentions: [senderId]
                            });
                        }

                        // Delete temporary Python file
                        fs.unlinkSync(filePath);
                    });
                }
            });
        } else {
            // If no inputs are required, directly execute the code
            const filePath = path.join(__dirname, 'temp_code.py');
            fs.writeFileSync(filePath, code);

            exec(`python3 ${filePath}`, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`[python command] Execution error:`, error);
                    await conn.sendMessage(chatId, { 
                        text: `⚠️ Error executing Python code: ${error.message}`, 
                        mentions: [senderId]
                    });
                } else if (stderr) {
                    console.debug(`[python command] Stderr:`, stderr);
                    await conn.sendMessage(chatId, { 
                        text: `⚠️ Python error: ${stderr}`, 
                        mentions: [senderId]
                    });
                } else {
                    console.debug(`[python command] Execution result:`, stdout);
                    await conn.sendMessage(chatId, { 
                        text: `📄 Output:\n${stdout}`, 
                        mentions: [senderId]
                    });
                }

                // Delete temporary Python file
                fs.unlinkSync(filePath);
            });
        }
    }
};
