from flask import Flask, request, send_file, jsonify
from pytube import Playlist, YouTube
import instaloader
import os
import uuid

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
        # Initialize Playlist
        playlist = Playlist(playlist_url)

        downloaded_songs = []
        downloading_songs = []

        for video in playlist.videos:
            downloading_songs.append(video.title)
            audio_stream = video.streams.filter(only_audio=True, file_extension='mp4').first()

            if audio_stream is None:
                return jsonify({"error": f"No downloadable audio stream found for {video.title}."}), 400
            
            audio_stream.download(output_path=DOWNLOAD_DIR, filename=f"{video.title}.mp4")

            downloaded_songs.append(video.title)
            downloading_songs.remove(video.title)

        return jsonify({"downloaded_files": downloaded_songs}), 200

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
        # Initialize Playlist
        playlist = Playlist(playlist_url)

        downloaded_videos = []
        downloading_videos = []

        for video in playlist.videos:
            downloading_videos.append(video.title)
            video_stream = video.streams.filter(progressive=True, file_extension='mp4').first()

            if video_stream is None:
                return jsonify({"error": f"No downloadable video stream found for {video.title}."}), 400

            video_stream.download(output_path=DOWNLOAD_DIR, filename=f"{video.title}.mp4")

            downloaded_videos.append(video.title)
            downloading_videos.remove(video.title)

        return jsonify({"downloaded_files": downloaded_videos}), 200

    except Exception as e:
        print(f"Error in YTV: {e}")  # Log the error to the console
        return jsonify({"error": str(e)}), 500  # Return the specific error message

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

