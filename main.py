from flask import Flask, request, send_file, jsonify
from pyinstadownload import PyInstaDownload
import os
import uuid

app = Flask(__name__)

# Directory path for temporary downloads
DOWNLOAD_DIR = "/home/Ampfar12/mysite/insta"
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
        download_path = os.path.join(DOWNLOAD_DIR, unique_id)
        
        # Initialize PyInstaDownload and download media
        downloader = PyInstaDownload()
        media_file = downloader.download(insta_url, folder=DOWNLOAD_DIR, filename=unique_id)
        
        # Send the file if download was successful
        if media_file and os.path.exists(media_file):
            response = send_file(media_file, as_attachment=True)
            
            # Delete the file after sending it
            @response.call_on_close
            def cleanup():
                if os.path.exists(media_file):
                    os.remove(media_file)

            return response

        return jsonify({"error": "Failed to download media"}), 500

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
