from flask import Flask, request, send_file, jsonify
import instaloader
import os
import uuid

app = Flask(__name__)

# Directory path for temporary downloads
DOWNLOAD_DIR = "/insta"
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
