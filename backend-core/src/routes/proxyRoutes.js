import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { url, referer } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const decodedUrl = decodeURIComponent(url);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        };

        let targetOrigin = '';
        try {
            const urlObj = new URL(decodedUrl);
            // Example: https://fetch7.flixcloud.cc -> https://flixcloud.cc
            const hostnameParts = urlObj.hostname.split('.');
            if (hostnameParts.length > 2) {
                targetOrigin = `${urlObj.protocol}//${hostnameParts.slice(-2).join('.')}`;
            } else {
                targetOrigin = urlObj.origin;
            }
        } catch (e) {
            // Ignore URL parsing errors
        }

        if (referer) {
            headers['Referer'] = referer;
            try {
                headers['Origin'] = new URL(referer).origin;
            } catch (e) {
                headers['Origin'] = targetOrigin;
            }
        } else if (targetOrigin) {
            headers['Referer'] = targetOrigin + '/';
            headers['Origin'] = targetOrigin;
        }

        const response = await axios({
            method: 'GET',
            url: decodedUrl,
            headers,
            responseType: 'stream',
            validateStatus: () => true, // Forward all status codes
            timeout: 15000
        });

        // Forward CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Forward important stream headers
        const headersToForward = [
            'content-type',
            'content-length',
            'accept-ranges',
            'content-range'
        ];

        headersToForward.forEach(header => {
            if (response.headers[header]) {
                res.setHeader(header, response.headers[header]);
            }
        });

        res.status(response.status);
        response.data.pipe(res);

    } catch (error) {
        console.error('[Proxy Error]:', error.message);
        res.status(500).json({ error: 'Failed to proxy request', details: error.message });
    }
});

export default router;
