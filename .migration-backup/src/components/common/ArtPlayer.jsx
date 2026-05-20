import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

const ArtPlayer = ({ src, type, poster, subtitles = [], onEnded, onTimeUpdate, onReady, initialTime = 0, className, autoSkip = true, skipTimes, videoQuality = 'best', onQualityChange, availableQualities = [] }) => {
    const artRef = useRef(null);
    const artInstance = useRef(null);

    useEffect(() => {
        if (!src) return;

        const isHls = type === 'hls' || src.includes('.m3u8');

        // Build quality options from actual available qualities
        const customSettings = [];
        const numericQualities = availableQualities.filter(q => /^\d+/.test(q));

        if (!isHls && onQualityChange) {
            let qualityOptions;

            if (numericQualities.length > 0) {
                // Sort descending (1080 → 720 → 480 → 360)
                numericQualities.sort((a, b) => parseInt(b) - parseInt(a));
                qualityOptions = [
                    { html: 'Auto', value: 'best', default: videoQuality === 'best' },
                    ...numericQualities.map(q => ({
                        html: `${q}p`,
                        value: q,
                        default: videoQuality === q,
                    }))
                ];
            } else {
                // No numeric qualities available — show standard options as fallback
                qualityOptions = [
                    { html: 'Auto', value: 'best', default: videoQuality === 'best' },
                    { html: '1080p', value: '1080', default: videoQuality === '1080' },
                    { html: '720p', value: '720', default: videoQuality === '720' },
                    { html: '480p', value: '480', default: videoQuality === '480' },
                    { html: '360p', value: '360', default: videoQuality === '360' },
                ];
            }

            const currentLabel = videoQuality === 'best' ? 'Auto' : `${videoQuality}p`;

            customSettings.push({
                name: 'quality',
                width: 150,
                html: 'Quality',
                tooltip: currentLabel,
                selector: qualityOptions,
                onSelect: function (item) {
                    if (onQualityChange) onQualityChange(item.value);
                    return item.html;
                },
            });
        }

        // Setup Audio Context for Volume Boost
        let audioCtx = null;
        let gainNode = null;
        let sourceNode = null;

        const setupAudioBoost = (videoElement) => {
            if (audioCtx) return;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
                sourceNode = audioCtx.createMediaElementSource(videoElement);
                gainNode = audioCtx.createGain();
                
                sourceNode.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Default to Boost (1.5)
                gainNode.gain.value = 1.5;
            } catch (err) {
                console.error("Audio Boost not supported or failed:", err);
            }
        };


        customSettings.push({
            name: 'audioBoost',
            width: 200,
            html: 'Audio Boost',
            tooltip: 'Boost (150%)',
            selector: [
                { html: 'Normal (100%)', value: 1.0 },
                { html: 'Boost (150%)', value: 1.5, default: true },
                { html: 'Loud (200%)', value: 2.0 },
                { html: 'Max (300%)', value: 3.0 },
                { html: 'Ultra (400%)', value: 4.0 },
            ],
            onSelect: function (item) {
                const player = artInstance.current;
                if (!player) return item.html;
                
                if (!audioCtx) {
                    setupAudioBoost(player.video);
                }
                
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                if (gainNode) {
                    gainNode.gain.value = item.value;
                    player.setting.update({ name: 'audioBoost', tooltip: item.html });
                }
                
                return item.html;
            },
        });

        // Auto Skip Toggle
        customSettings.push({
            name: 'autoSkip',
            width: 200,
            html: 'Auto Skip OP/ED',
            tooltip: autoSkip ? 'On' : 'Off',
            selector: [
                { html: 'On', value: true, default: autoSkip === true },
                { html: 'Off', value: false, default: autoSkip === false },
            ],
            onSelect: function (item) {
                const player = artInstance.current;
                if (player) {
                    player.setting.update({ name: 'autoSkip', tooltip: item.html });
                    // Store preference or just update local state if needed
                }
                return item.html;
            },
        });

        // --- Subtitle Selector ---
        if (subtitles && subtitles.length > 0) {
            const subOptions = [
                { html: 'None', value: 'none', default: false },
                ...subtitles.map((s, i) => ({
                    html: s.lang || `Track ${i + 1}`,
                    value: s.url,
                    default: i === 0
                }))
            ];

            customSettings.push({
                name: 'subtitle-select',
                width: 200,
                html: 'Subtitles',
                tooltip: subtitles[0]?.lang || 'English',
                selector: subOptions,
                onSelect: function (item) {
                    const player = artInstance.current;
                    if (!player) return item.html;
                    
                    if (item.value === 'none') {
                        player.subtitle.show = false;
                        player.setting.update({ name: 'subtitle-select', tooltip: 'None' });
                    } else {
                        player.subtitle.switch(item.value, { name: item.html });
                        player.subtitle.show = true;
                        player.setting.update({ name: 'subtitle-select', tooltip: item.html });
                    }
                    return item.html;
                },
            });
        }

        const art = new Artplayer({
            container: artRef.current,
            url: src,
            poster: poster,
            type: isHls ? 'm3u8' : 'mp4',
            volume: 1.0,
            isLive: false,
            muted: false,
            autoplay: false,
            autoPlayback: false,
            pip: true,
            autoSize: true,
            screenshot: true,
            setting: true,
            settings: customSettings,
            autoHideCursor: false,
            autoHideControl: true,
            loop: false,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: true,
            subtitleOffset: false,
            mutex: true,
            backdrop: true,
            playsInline: true,
            airplay: false,
            lock: true,
            fastForward: false,
            theme: '#ff0000',
            layers: [
                {
                    name: 'mutedIndicator',
                    html: `
                        <div class="flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm px-5 py-3 rounded-xl hover:bg-black/70 transition-colors pointer-events-auto cursor-pointer border border-white/10 shadow-lg">
                            <svg class="w-8 h-8 text-white/90 mb-1 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                            <span class="text-white/90 font-bold tracking-widest uppercase text-[11px] drop-shadow-md">Tap to Unmute</span>
                        </div>
                    `,
                    style: {
                        position: 'absolute',
                        top: '40px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'none',
                        zIndex: 99,
                    },
                    click: function () {
                        if (artInstance.current) {
                            artInstance.current.muted = false;
                            if (artInstance.current.volume === 0) artInstance.current.volume = 1;
                        }
                    }
                },
                {
                    name: 'skipButton',
                    html: `
                        <div class="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-500/20 group">
                            <span class="text-[12px] font-black uppercase tracking-[0.2em]">Skip Intro</span>
                            <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </div>
                    `,
                    style: {
                        position: 'absolute',
                        bottom: '80px',
                        right: '30px',
                        display: 'none',
                        zIndex: 99,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                    },
                    click: function () {
                        const art = artInstance.current;
                        if (art && skipTimes) {
                            const currentTime = art.currentTime;
                            if (skipTimes.op && currentTime >= skipTimes.op[0] && currentTime < skipTimes.op[1]) {
                                art.currentTime = skipTimes.op[1];
                            } else if (skipTimes.ed && currentTime >= skipTimes.ed[0] && currentTime < skipTimes.ed[1]) {
                                art.currentTime = skipTimes.ed[1];
                            }
                        }
                    }
                },
            ],
            controls: [
                {
                    position: 'left',
                    index: 1,
                    html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="7" font-weight="bold">10</text></svg>',
                    tooltip: '-10s',
                    click: function () {
                        const a = artInstance.current;
                        if (a) a.currentTime = Math.max(0, a.currentTime - 10);
                    },
                },
                {
                    position: 'left',
                    index: 2,
                    html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="7" font-weight="bold">10</text></svg>',
                    tooltip: '+10s',
                    click: function () {
                        const a = artInstance.current;
                        if (a) a.currentTime = Math.min(a.video.duration || Infinity, a.currentTime + 10);
                    },
                },
            ],
            moreVideoAttr: {
                crossOrigin: 'anonymous',
                preload: 'auto', // Hints the browser to start downloading immediately
            },
            customType: {
                m3u8: function (video, url, art) {
                    if (Hls.isSupported()) {
                        if (art.hls) art.hls.destroy();
                        
                        // Smart Preload & Buffer Optimization
                        const hls = new Hls({
                            maxBufferLength: 60, // Aim to keep 60 seconds buffered
                            maxMaxBufferLength: 600, // Hard limit of 10 minutes (to avoid memory bloat)
                            maxBufferSize: 60 * 1024 * 1024, // Up to 60MB of RAM for buffer
                            enableWorker: true, // Use background thread for parsing (no lag)
                            lowLatencyMode: false,
                        });
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        art.hls = hls;
                        
                        hls.on(Hls.Events.MANIFEST_PARSED, function () {
                            const levels = hls.levels;
                            if (levels && levels.length > 0) {
                                const quality = levels.map((item, index) => ({
                                    html: item.height ? `${item.height}p` : 'Auto',
                                    url: url,
                                    level: index,
                                    default: index === 0,
                                }));
                                
                                // Add Auto option
                                quality.unshift({
                                    html: 'Auto',
                                    url: url,
                                    level: -1,
                                    default: true,
                                });

                                art.setting.update({
                                    name: 'quality',
                                    width: 150,
                                    html: 'Quality',
                                    tooltip: 'Auto',
                                    selector: quality,
                                    onSelect: function (item) {
                                        art.hls.currentLevel = item.level;
                                        art.setting.update({ name: 'quality', tooltip: item.html });
                                        return item.html;
                                    },
                                });
                            }
                        });
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    }
                },
            },
            subtitle: {
                url: subtitles[0]?.url || '',
                type: 'vtt',
                style: {
                    color: '#fff',
                    fontSize: '20px',
                },
                encoding: 'utf-8',
            },
        });

        artInstance.current = art;

        const updateMutedIndicator = () => {
            const isMuted = art.muted || art.volume === 0;
            if (art.layers.mutedIndicator) {
                art.layers.mutedIndicator.style.display = isMuted ? 'block' : 'none';
            }
        };

        art.on('ready', updateMutedIndicator);
        art.on('video:volumechange', updateMutedIndicator);

        // Automatically apply Default Boost when video plays
        art.on('play', () => {
            if (!audioCtx) {
                setupAudioBoost(art.video);
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        });

        art.on('video:ended', () => {
            if (onEnded) onEnded();
            window.postMessage({ event: "complete", type: "ended" }, "*");
        });

        art.on('video:timeupdate', () => {
            const currentTime = art.video.currentTime;
            const duration = art.video.duration;

            // --- Auto Skip & UI Button Logic (OP/ED) ---
            if (skipTimes) {
                const isOP = skipTimes.op && currentTime >= skipTimes.op[0] && currentTime < skipTimes.op[1];
                const isED = skipTimes.ed && currentTime >= skipTimes.ed[0] && currentTime < skipTimes.ed[1];
                
                // Show/Hide Manual Skip Button
                if (art.layers.skipButton) {
                    art.layers.skipButton.style.display = (isOP || isED) ? 'block' : 'none';
                }

                // Automatic Skip (if enabled in settings)
                const isAutoSkipEnabled = art.setting.get('autoSkip') !== 'Off';
                if (isAutoSkipEnabled) {
                    if (isOP) {
                        console.info(`[ArtPlayer] ⚡ Auto-skipping OP: ${skipTimes.op[0]}s -> ${skipTimes.op[1]}s`);
                        art.currentTime = skipTimes.op[1];
                    }
                    if (isED) {
                        console.info(`[ArtPlayer] ⚡ Auto-skipping ED: ${skipTimes.ed[0]}s -> ${skipTimes.ed[1]}s`);
                        art.currentTime = skipTimes.ed[1];
                    }
                }
            } else {
                // Periodically check if skipTimes arrived later
                if (art.video.currentTime < 5) {
                    // Only log at start to avoid spam
                    // console.debug("[ArtPlayer] No skipTimes prop received for this episode.");
                }
            }

            if (onTimeUpdate) onTimeUpdate(currentTime, duration);
            window.postMessage({ event: "timeupdate", currentTime, duration }, "*");
        });

        art.on('ready', () => {
            if (onReady) onReady();

            // Safe seek: wait for metadata to load to prevent infinite stalling
            const safeSeek = () => {
                if (initialTime > 0 && !art.hasSetInitialTime) {
                    art.currentTime = initialTime;
                    art.hasSetInitialTime = true;
                }
            };

            if (art.video.readyState >= 1) {
                safeSeek();
            } else {
                art.once('video:loadedmetadata', safeSeek);
            }

            // Smart Autoplay: Try to play with sound, fallback to muted if blocked
            art.play().catch(() => {
                console.info('[ArtPlayer] Autoplay with sound blocked, falling back to muted.');
                art.muted = true;
                art.play();
            });
        });

        const handleMessage = (e) => {
            if (e.data?.event === "skip") {
                const amount = e.data.amount || 0;
                art.currentTime = Math.max(0, Math.min(art.video.duration, art.currentTime + amount));
            }
        };
        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
            if (art) {
                try {
                    // Clean up HLS instance if it exists
                    if (art.hls) {
                        art.hls.destroy();
                        art.hls = null;
                    }
                    art.destroy();
                } catch (err) {
                    console.warn("ArtPlayer destroy error:", err);
                }
            }
        };
    }, [src, poster, type, initialTime, autoSkip, skipTimes, videoQuality]);

    return <div ref={artRef} className={className} style={{ width: '100%', height: '100%' }}></div>;
};

export default ArtPlayer;
