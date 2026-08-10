import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, 
    message: { error: 'Too many proxy requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/', proxyLimiter, async (req, res) => {
    try {
        const { url, referer } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const targetUrl = url;

        let targetOrigin = '';
        try {
            const parsedUrl = new URL(targetUrl);
            targetOrigin = parsedUrl.origin;
        } catch (e) {
            console.error('[Proxy] Invalid target URL:', targetUrl);
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
        };

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

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers,
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        const isM3U8 = contentType.includes('mpegurl') || contentType.includes('mpegURL') || targetUrl.includes('.m3u8');

        if (isM3U8) {
            const baseUrl = new URL(targetUrl);
            const proxyBase = `${req.protocol}://${req.get('host')}/api/proxy`;

            let bodyText = await response.text();
            
            bodyText = bodyText.split('\n').map(line => {
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
            const contentLength = response.headers.get('content-length');
            if (contentLength) res.setHeader('Content-Length', contentLength);
            
            res.status(response.status);
            
            if (response.body) {
                const reader = response.body.getReader();
                const pump = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            res.end();
                            break;
                        }
                        res.write(value);
                    }
                };
                return pump().catch(err => {
                    console.error('[Proxy Stream Error]', err);
                    res.end();
                });
            } else {
                return res.end();
            }
        }

    } catch (error) {
        console.error('[Proxy Catch Error]:', error.message);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

export default router;
