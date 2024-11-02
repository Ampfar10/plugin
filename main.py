from flask import Flask, request, send_file, jsonify
import instaloader
import os
import uuid
import random

app = Flask(__name__)

# Directory path for temporary downloads
DOWNLOAD_DIR = "insta"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Load proxies from a file and add "http://" if missing
def load_proxies():
    with open("http.txt", "r") as file:
        proxies = [
            proxy.strip() if proxy.startswith("http") else f"http://{proxy.strip()}"
            for proxy in file.readlines()
        ]
    return proxies

# Choose a random proxy
def get_random_proxy():
    proxies = load_proxies()
    if proxies:
        return random.choice(proxies)
    return None

@app.route('/insta', methods=['POST'])
def download_insta_media():
    data = request.json
    insta_url = data.get('url')
    if not insta_url:
        return jsonify({"error": "No URL provided"}), 400

    # Choose a random proxy
    proxy = get_random_proxy()
    if not proxy:
        return jsonify({"error": "No proxies available"}), 500

    proxy_dict = {
        'http': proxy,
        'https': proxy,
    }

    try:
        # Initialize instaloader with proxy and download the media
        loader = instaloader.Instaloader(dirname_pattern=DOWNLOAD_DIR, filename_pattern=str(uuid.uuid4()))
        loader.context.session.proxies = proxy_dict
        post = instaloader.Post.from_shortcode(loader.context, insta_url.split("/")[-2])
        loader.download_post(post, target=DOWNLOAD_DIR)

        # Find the downloaded media file
        media_file = next((f for f in os.listdir(DOWNLOAD_DIR) if f.endswith(('.mp4', '.jpg'))), None)
        if media_file:
            media_path = os.path.join(DOWNLOAD_DIR, media_file)
            response = send_file(media_path, as_attachment=True)

            # Clean up the file after sending
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
