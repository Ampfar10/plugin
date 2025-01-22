from flask import Flask, request, jsonify, send_file
from pytube import YouTube
from redis import Redis
import os
import uuid
import time
import requests

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
        # Set custom headers using requests
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # Create a YouTube object with custom headers
        yt = YouTube(url)
        yt.streams.filter(only_audio=True).first()
        
        # Use requests session to fetch the video with custom headers
        session = requests.Session()
        session.headers.update(headers)
        
        # Manually fetch the video using requests to bypass YouTube's restrictions
        yt._extract_video_info()
        yt.streams._filter_files()
        
        audio_stream = yt.streams.filter(only_audio=True).first()
        filename = f"{uuid.uuid4().hex}.mp3"
        file_path = os.path.join(DOWNLOAD_FOLDER, filename)
        audio_stream.download(output_path=DOWNLOAD_FOLDER, filename=filename)
        
        # Cache the file path for an hour
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
