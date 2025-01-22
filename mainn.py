from flask import Flask, request, jsonify, send_file
from pytube import YouTube
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

    yt = YouTube(url)
    audio_stream = yt.streams.filter(only_audio=True).first()
    filename = f"{uuid.uuid4().hex}.mp3"
    file_path = os.path.join(DOWNLOAD_FOLDER, filename)
    audio_stream.download(output_path=DOWNLOAD_FOLDER, filename=filename)
    
    cache.set(url, file_path, ex=3600)  # Cache result for 1 hour
    return file_path

@app.route('/download-music', methods=['POST'])
def download_music_endpoint():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        start_time = time.time()  # Start timing
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
    app.run(host=0.0.0.0, debug=True threaded=True)
           
