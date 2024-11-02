from flask import Flask, request, send_file, jsonify
import os
import uuid
import subprocess

app = Flask(__name__)

# Directory path for temporary downloads
DOWNLOAD_DIR = "insta"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/insta', methods=['POST'])
def download_insta_media():
    data = request.json
    insta_url = data.get('url')
    if not insta_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        # Generate a unique filename
        unique_id = str(uuid.uuid4())
        
        # Use instagram-scraper to download media
        command = [
            "instagram-scraper",
            insta_url,
            "--destination", DOWNLOAD_DIR,
            "--media-types", "image,video",
            "--latest-stamps", DOWNLOAD_DIR,
            "--filename-template", unique_id
        ]
        subprocess.run(command, check=True)

        # Find downloaded media file
        media_file = next((f for f in os.listdir(DOWNLOAD_DIR) if unique_id in f), None)
        if media_file:
            media_path = os.path.join(DOWNLOAD_DIR, media_file)
            
            # Send the media file
            response = send_file(media_path, as_attachment=True)

            # Schedule file deletion after sending
            @response.call_on_close
            def cleanup():
                os.remove(media_path)
            
            return response

        return jsonify({"error": "Failed to download media"}), 500

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
