from flask import Flask, request, jsonify, send_file
import yt_dlp as youtube_dl
from redis import Redis
import os
import uuid
import time

app = Flask(__name__)
DOWNLOAD_FOLDER = 'downloads'

# Initialize Redis
cache = Redis(host='localhost', port=6379, db=0)

# Ensure download folder exists
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

def download_youtube_audio(url):
    """Download audio from YouTube and cache the result."""
    cached_file = cache.get(url)
    if cached_file:
        return cached_file.decode()  # Return cached file path if available

    try:
        # yt-dlp options for downloading audio
        ydl_opts = {
            'format': 'bestaudio/best',  # Best audio format
            'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(id)s.%(ext)s'),  # Save path with unique file name
            'quiet': True,  # Suppress unnecessary logs
            'headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            'postprocessors': [{
                'key': 'FFmpegAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
                'nopostoverwrites': True,  # Avoid overwriting files
                'ffmpeg_location': '/usr/bin/ffmpeg',  # Explicit path to ffmpeg
            }],
        }

        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            filename = f"{info_dict['id']}.mp3"  # Using the video ID as the file name
            file_path = os.path.join(DOWNLOAD_FOLDER, filename)

        # Cache the file path for one hour
        cache.set(url, file_path, ex=3600)
        return file_path
    except Exception as e:
        print(f"Error downloading video: {e}")
        raise Exception("Failed to download audio")
        

@app.route('/download-music', methods=['POST'])
def download_music_endpoint():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        start_time = time.time()  # Start timing the download
        music_path = download_youtube_audio(url)
        elapsed_time = time.time() - start_time  # Calculate elapsed time

        response = send_file(music_path, as_attachment=True)
        response.headers['X-Download-Time'] = f"{elapsed_time:.2f} seconds"
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'message': 'YouTube Music Downloader with Redis and Timer is running!'})

if __name__ == '__main__':
    # Host on 0.0.0.0 for public access and enable debug mode
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
