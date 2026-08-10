import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { url, referer } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // req.query.url is already decoded by Express.
        // We do NOT use decodeURIComponent here to avoid double-decoding 
        // which can corrupt complex tokens or nested query strings.
        const targetUrl = url;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        };

        let targetOrigin = '';
        try {
            const urlObj = new URL(targetUrl);
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

        const isM3U8 = targetUrl.includes('.m3u8');

        const response = await axios({
            method: 'GET',
            url: targetUrl,
            headers,
            responseType: isM3U8 ? 'text' : 'stream',
            validateStatus: () => true, // Forward all status codes
            timeout: 15000
        });

        // Detailed logging for debugging 403s
        if (response.status === 403) {
            console.error('[Proxy 403 Error] Target URL:', targetUrl);
            console.error('[Proxy 403 Error] Headers Sent:', headers);
        }

        // Forward CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);

        if (isM3U8 && typeof response.data === 'string') {
            const baseUrl = new URL(targetUrl);
            const proxyBase = `${req.protocol}://${req.get('host')}/api/proxy`;

            let bodyText = response.data.split('\n').map(line => {
                let trimmed = line.trim();
                if (!trimmed) return line;
                
                if (trimmed.startsWith('#') && trimmed.includes('URI=')) {
                    return trimmed.replace(/URI="([^"]+)"/, (match, p1) => {
                        try {
                            const absUrl = new URL(p1, baseUrl).toString();
                            const proxyUrl = `${proxyBase}?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer || '')}`;
                            return `URI="${proxyUrl}"`;
                        } catch(e) { return match; }
                    });
                }
                
                if (!trimmed.startsWith('#')) {
                    try {
                        const absUrl = new URL(trimmed, baseUrl).toString();
                        const proxyUrl = `${proxyBase}?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer || '')}`;
                        return proxyUrl;
                    } catch (e) { return trimmed; }
                }
                return trimmed;
            }).join('\n');
            
            res.setHeader('Content-Length', Buffer.byteLength(bodyText));
            res.status(response.status);
            return res.send(bodyText);
        } else {
            if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
            res.status(response.status);
            return response.data.pipe(res);
        }

    } catch (error) {
        console.error('[Proxy Catch Error]:', error.message);
        if (error.response) {
            console.error('[Proxy Catch Error Status]:', error.response.status);
            console.error('[Proxy Catch Error Headers]:', error.response.headers);
        }
        res.status(500).json({ error: 'Failed to proxy request', details: error.message });
    }
});

export default router;
