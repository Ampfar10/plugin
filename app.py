import asyncio
import os
from flask import Flask, send_file
from pyppeteer import launch

app = Flask(__name__)

# Directories and file paths
session_dir = "whatsapp_session"  # Directory to store session data
qr_code_image_path = "qr_code.png"  # Path to store the QR code screenshot

# Function to create the necessary directories if they don't exist
def create_directories():
    # Ensure the session directory exists
    if not os.path.exists(session_dir):
        os.makedirs(session_dir)
        print(f"Created session directory: {session_dir}")

    # Ensure the qr_code image path is available (not necessary for directory, but for file existence)
    if not os.path.exists(qr_code_image_path):
        with open(qr_code_image_path, 'w') as file:
            pass  # Just create an empty file placeholder if it doesn't exist

# Function to launch WhatsApp Web, capture the QR code, and save it as an image
async def get_qr_code():
    # Ensure the directories and files exist
    create_directories()

    # Check if session file exists and load session data if available
    if os.path.exists(session_dir):
        print("Loading saved session...")
        browser = await launch(headless=False, userDataDir=session_dir)  # Load saved session
        page = await browser.newPage()
        await page.goto('https://web.whatsapp.com')

        # Wait for the QR code to load and appear on screen
        try:
            # Wait for the QR code canvas element
            await page.waitForSelector('canvas[aria-label="Scan me!"]', {"timeout": 30000})  # Wait for QR code to show
            print("QR code found, taking a screenshot...")

            # Take a screenshot of the QR code
            await page.screenshot({'path': qr_code_image_path, 'clip': await page.evaluate('''
                () => {
                    const qrCanvas = document.querySelector('canvas[aria-label="Scan me!"]');
                    const rect = qrCanvas.getBoundingClientRect();
                    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                }
            ''')})
            print("QR code screenshot saved!")

        except Exception as e:
            print(f"Error while waiting for QR code: {e}")
            return

        await browser.close()
    else:
        print("No saved session found, generating QR code...")
        browser = await launch(headless=False)  # Launch new browser if no session exists
        page = await browser.newPage()
        await page.goto('https://web.whatsapp.com')

        # Wait for QR code to load
        try:
            # Wait for the QR code canvas element
            await page.waitForSelector('canvas[aria-label="Scan me!"]', {"timeout": 30000})  # Wait for QR code to show
            print("QR code found, taking a screenshot...")

            # Take a screenshot of the QR code
            await page.screenshot({'path': qr_code_image_path, 'clip': await page.evaluate('''
                () => {
                    const qrCanvas = document.querySelector('canvas[aria-label="Scan me!"]');
                    const rect = qrCanvas.getBoundingClientRect();
                    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                }
            ''')})
            print("QR code screenshot saved!")

            # Save session after scanning QR code
            print("Saving session...")
            await browser.contexts[0].storageState(path=session_dir)

        except Exception as e:
            print(f"Error while waiting for QR code: {e}")
            return

        await browser.close()
        print("Session saved!")

# Flask route to show the QR code image to the user
@app.route('/qr')
def show_qr():
    if os.path.exists(qr_code_image_path):
        return send_file(qr_code_image_path, mimetype='image/png')
    else:
        return '<h1>Waiting for QR Code...</h1>'

@app.route('/')
def index():
    return '''
        <h1>WhatsApp Bot</h1>
        <p>Go to <a href="/qr">/qr</a> to see the QR code.</p>
    '''

if __name__ == "__main__":
    # Start the asyncio event loop to get the QR code or reuse session
    asyncio.get_event_loop().run_until_complete(get_qr_code())

    # Run the Flask app
    app.run(debug=True, port=5000)
