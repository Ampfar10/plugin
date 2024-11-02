from flask import Flask, request, send_file, jsonify
from pytube import Playlist
import instaloader
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
        # Initialize instaloader
        loader = instaloader.Instaloader(dirname_pattern=DOWNLOAD_DIR, filename_pattern=str(uuid.uuid4()))
        post = instaloader.Post.from_shortcode(loader.context, insta_url.split("/")[-2])
        
        # Check if the post is a video or an image
        if post.is_video:
            loader.download_post(post, target=DOWNLOAD_DIR)
            file_extension = ".mp4"
        else:
            loader.download_post(post, target=DOWNLOAD_DIR)
            file_extension = ".jpg"

        # Find the media file in the directory
        media_file = next((f for f in os.listdir(DOWNLOAD_DIR) if f.endswith(file_extension)), None)
        if media_file:
            media_path = os.path.join(DOWNLOAD_DIR, media_file)
            
            # Send the media file as a response
            response = send_file(media_path, as_attachment=True)
            
            # Delete the file after sending
            @response.call_on_close
            def cleanup():
                if os.path.exists(media_path):
                    os.remove(media_path)

            return response

        return jsonify({"error": "Failed to download media"}), 500

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

# Global variables to hold the state
current_playlist_url = None
downloaded_songs = []
downloading_songs = []

@app.route('/')
def status():
    return jsonify({
        "playlist_url": current_playlist_url,
        "downloaded_songs": downloaded_songs,
        "downloading_songs": downloading_songs
    })

@app.route('/yta', methods=['POST'])
def download_youtube_playlist():
    global current_playlist_url, downloaded_songs, downloading_songs
    data = request.json
    playlist_url = data.get('url')
    if not playlist_url:
        return jsonify({"error": "No URL provided"}), 400

    current_playlist_url = playlist_url
    downloading_songs = []

    try:
        # Initialize Playlist
        playlist = Playlist(playlist_url)

        for video in playlist.videos:
            downloading_songs.append(video.title)

            # Download the audio stream of each video
            audio_stream = video.streams.filter(only_audio=True).first()
            audio_file_path = os.path.join(DOWNLOAD_DIR, f"{video.title}.mp3")
            audio_stream.download(output_path=DOWNLOAD_DIR, filename=f"{video.title}.mp3")

            # Update downloaded songs
            downloaded_songs.append(video.title)
            downloading_songs.remove(video.title)

        # Return the list of downloaded songs
        return jsonify({"audio_files": downloaded_songs}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

@app.route('/ytv', methods=['POST'])
def download_youtube_video():
    data = request.json
    video_url = data.get('url')
    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        # Initialize YouTube object
        video = YouTube(video_url)
        video_stream = video.streams.filter(progressive=True, file_extension='mp4').first()

        # Define the file path for the downloaded video
        video_file_path = os.path.join(DOWNLOAD_DIR, f"{video.title}.mp4")
        video_stream.download(output_path=DOWNLOAD_DIR, filename=f"{video.title}.mp4")

        return jsonify({"video_file": video.title}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
