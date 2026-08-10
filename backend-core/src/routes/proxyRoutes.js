import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { url, referer } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        if (referer) {
            headers['Referer'] = referer;
            try {
                headers['Origin'] = new URL(referer).origin;
            } catch (e) {
                // Ignore invalid referer parsing errors
            }
        }

        const response = await axios({
            method: 'GET',
            url: decodeURIComponent(url),
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
