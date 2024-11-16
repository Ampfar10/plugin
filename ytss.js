const { google } = require('googleapis'); 
const youtube = google.youtube('v3');

// Replace 'YOUR_API_KEY' with your actual YouTube Data API key
const API_KEY = 'AIzaSyBQSOlFefCVJjVctHDs2VPwkUAJvJRuKH4';

// Function to search YouTube videos
const searchYouTube = async (query) => {
    const response = await youtube.search.list({
        part: 'snippet',
        q: query,
        maxResults: 10,
        type: 'video',
        key: API_KEY,
    });

    return response.data.items;
};

// Function to get video details (including duration)
const getVideoDetails = async (videoIds) => {
    const response = await youtube.videos.list({
        part: 'contentDetails',
        id: videoIds.join(','),
        key: API_KEY,
    });

    return response.data.items.map(item => ({
        id: item.id,
        duration: item.contentDetails.duration,
    }));
};

// Format video duration from ISO 8601 to a human-readable format
const formatDuration = (isoDuration) => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? match[1].replace('H', '') : '0';
    const minutes = match[2] ? match[2].replace('M', '') : '0';
    const seconds = match[3] ? match[3].replace('S', '') : '0';

    return `${hours !== '0' ? `${hours}h ` : ''}${minutes !== '0' ? `${minutes}m ` : ''}${seconds}s`;
};

// Format YouTube response with details and duration
const formatYouTubeResponse = async (items) => {
    const videoIds = items.map(item => item.id.videoId);
    const videoDetails = await getVideoDetails(videoIds);

    return items.map((item, index) => {
        const details = videoDetails.find(v => v.id === item.id.videoId);
        return {
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high.url,
            duration: formatDuration(details?.duration || 'PT0S'),
        };
    });
};

// Main command handling
module.exports = {
    name: 'yts',
    description: '🔍 Search YouTube and return video links',
    category: 'Search',
    async execute(conn, chatId, args) {
        const query = args.join(' ');

        if (!query) {
            return conn.sendMessage(chatId, { text: '❓ Please provide a search query!' });
        }

        try {
            const items = await searchYouTube(query);
            const videos = await formatYouTubeResponse(items);

            let responseMessage = '🎥 *YouTube Search Results:* \n\n';
            videos.forEach((video, index) => {
                responseMessage += `✨ ${index + 1}. *${video.title}*\n📺 ${video.url}\n⏳ Duration: ${video.duration}\n\n`;
            });

            // Include the thumbnail of the first video in high quality
            if (videos.length > 0) {
                await conn.sendMessage(chatId, {
                    image: { url: videos[0].thumbnail },
                    caption: responseMessage,
                });
            } else {
                conn.sendMessage(chatId, { text: '😔 No results found.' });
            }
        } catch (error) {
            console.error('YouTube search error:', error);
            conn.sendMessage(chatId, { text: '⚠️ An error occurred while searching YouTube.' });
        }
    },
};
