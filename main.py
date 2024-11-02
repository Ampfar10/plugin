from flask import Flask, request, jsonify
import os
import youtube_dl

app = Flask(__name__)

# Directory path for temporary downloads
DOWNLOAD_DIR = "insta"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/yta', methods=['POST'])
def download_youtube_playlist_audio():
    data = request.json
    playlist_url = data.get('url')

    if not playlist_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
            'postprocessors': [],  # No post-processing, keep original format
            'quiet': False,  # Set to True to suppress output
        }

        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            ydl.download([playlist_url])
        
        # List all downloaded files
        downloaded_files = os.listdir(DOWNLOAD_DIR)
        return jsonify({"downloaded_files": downloaded_files}), 200

    except Exception as e:
        print(f"Error in YTA: {e}")  # Log the error to the console
        return jsonify({"error": str(e)}), 500  # Return the specific error message


@app.route('/ytv', methods=['POST'])
def download_youtube_playlist_video():
    data = request.json
    playlist_url = data.get('url')

    if not playlist_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = {
            'format': 'bestvideo+bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
            'postprocessors': [],  # No post-processing, keep original format
            'quiet': False,  # Set to True to suppress output
        }

        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            ydl.download([playlist_url])
        
        # List all downloaded files
        downloaded_files = os.listdir(DOWNLOAD_DIR)
        return jsonify({"downloaded_files": downloaded_files}), 200

    except Exception as e:
        print(f"Error in YTV: {e}")  # Log the error to the console
        return jsonify({"error": str(e)}), 500  # Return the specific error message


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
