from flask import Flask, request, send_file, jsonify
import instasave
import os
import uuid

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
        # Use instasave to download media
        media_path = instasave.download(insta_url, DOWNLOAD_DIR)
        
        if not media_path:
            return jsonify({"error": "Failed to download media"}), 500

        # Determine the file extension based on the downloaded file
        file_extension = os.path.splitext(media_path)[-1]
        
        # Send the media file as a response
        response = send_file(media_path, as_attachment=True)

        # Delete the file after sending
        @response.call_on_close
        def cleanup():
            if os.path.exists(media_path):
                os.remove(media_path)

        return response

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
