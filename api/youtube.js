const CHANNEL_ID = 'UC_7AVKwm-_1DafjOzffcCoQ';
const UPLOADS_PLAYLIST_ID = `UU${CHANNEL_ID.slice(2)}`;
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

function json(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.end(JSON.stringify(payload));
}

function normalizeVideo(item) {
    const snippet = item.snippet || {};
    const resourceId = snippet.resourceId || {};
    const videoId = item.id?.videoId || resourceId.videoId || item.id || '';

    return {
        title: snippet.title || 'Streams of Joy Owerri service',
        link: videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'https://www.youtube.com/@streamsofjoyowerri',
        videoId,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        published: snippet.publishedAt || '',
        description: snippet.description || ''
    };
}

async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`YouTube API returned ${response.status}`);
    }
    return response.json();
}

module.exports = async function handler(req, res) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const basePayload = {
        items: [],
        isLive: false,
        liveVideo: null,
        lastUpdated: new Date().toISOString()
    };

    if (!apiKey) {
        return json(res, 200, {
            ...basePayload,
            error: 'YOUTUBE_API_KEY is not configured.'
        });
    }

    try {
        const params = new URLSearchParams({
            part: 'snippet',
            channelId: CHANNEL_ID,
            eventType: 'live',
            type: 'video',
            maxResults: '1',
            key: apiKey
        });
        const liveData = await getJson(`${YOUTUBE_API}/search?${params.toString()}`);
        const liveVideo = liveData.items?.[0] ? normalizeVideo(liveData.items[0]) : null;

        const uploadParams = new URLSearchParams({
            part: 'snippet',
            playlistId: UPLOADS_PLAYLIST_ID,
            maxResults: '12',
            key: apiKey
        });
        const uploadsData = await getJson(`${YOUTUBE_API}/playlistItems?${uploadParams.toString()}`);
        const uploadItems = (uploadsData.items || []).map(normalizeVideo);
        const deduped = liveVideo
            ? [liveVideo, ...uploadItems.filter(item => item.videoId !== liveVideo.videoId)]
            : uploadItems;

        return json(res, 200, {
            ...basePayload,
            items: deduped.slice(0, 12),
            isLive: Boolean(liveVideo),
            liveVideo
        });
    } catch (error) {
        return json(res, 200, {
            ...basePayload,
            error: error.message || 'Unable to reach YouTube API.'
        });
    }
};
