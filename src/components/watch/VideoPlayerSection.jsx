import { useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import VideoPlayer from "../common/VideoPlayer";
import AnikoPlayer from "../common/AnikoPlayer";

/**
 * VideoPlayerSection
 * Handles rendering the video player, upcoming/not-yet-released state,
 * loading overlay, error state, and iframe rendering.
 */
export default function VideoPlayerSection({
    anime,
    activeEpisode,
    malEpisodes,
    streamLoading,
    streamUrl,
    iframeLoaded,
    setIframeLoaded,
    fetchError,
    activeServer,
    setActiveServer,
    streamData,
    playerLang,
    initialTime,
    autoNext,
    episodesList,
    setActiveEpisode,
    iframeRef,
    activeSubServer = 0,
    setActiveSubServer,
    skipTimes,
    videoRef,
    onPlay,
    onPause,
    onSeeked,
    onPlaybackError,
    isWatch2GetherMode,
    isW2GHost,
}) {
    const { t } = useTranslation();
    const prevServerRef = useRef(activeServer);

    const anikoBase = import.meta.env.VITE_ANIKO_API || "http://localhost:3000";

    // When switching servers, kill the old iframe to stop background playback
    useEffect(() => {
        if (prevServerRef.current !== activeServer) {
            // If we were previously on an iframe server, blank it out to stop audio/video
            if (iframeRef.current) {
                try {
                    iframeRef.current.src = 'about:blank';
                } catch { /* cross-origin safety */ }
            }
            prevServerRef.current = activeServer;
        }
    }, [activeServer, iframeRef]);

    // Inject AniXo Embed SDK for Servers 2-6 (required by Megaplay + AniXo embed providers)
    // The SDK must be present on the page or the embed will show "Invalid Embed" errors.
    useEffect(() => {
        const SDK_ID = 'anixo-embed-sdk';
        const needsSDK = activeServer >= 2 && activeServer <= 6;

        if (needsSDK) {
            // Only inject if not already present
            if (!document.getElementById(SDK_ID)) {
                const script = document.createElement('script');
                script.id = SDK_ID;
                script.src = 'https://anixo.buzz/embed-sdk.js';
                script.async = true;
                document.head.appendChild(script);
            }
        }

        // Cleanup: remove SDK when switching away from servers 2-6 or on unmount
        return () => {
            const existing = document.getElementById(SDK_ID);
            if (existing && !(activeServer >= 2 && activeServer <= 6)) {
                existing.remove();
            }
        };
    }, [activeServer]);

    // Resolve current episode image for player background/loading placeholder
    const currentEpisodeImage = useMemo(() => {
        if (!anime) return null;
        const epData = malEpisodes?.find((e) => e.mal_id === activeEpisode);
        const aniListEp =
            anime?.streamingEpisodes?.find(
                (se) =>
                    se.title &&
                    /Episode\s+(\d+)/i.test(se.title) &&
                    parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === activeEpisode
            ) ||
            (anime?.streamingEpisodes
                ? anime.streamingEpisodes.at(activeEpisode - 1)
                : null);

        return (
            aniListEp?.thumbnail ||
            epData?.images?.jpg?.image_url ||
            anime?.bannerImage ||
            anime?.coverImage?.extraLarge ||
            anime?.coverImage?.large
        );
    }, [anime, malEpisodes, activeEpisode]);

    let videoSrc = null;
    let videoType = null;
    let isIframe = false;
    let currentIframeUrl = streamUrl;

    if ((activeServer === 1 || activeServer === 6) && streamData?.all_streams) {
        // For Server 1, prefer embed streams (flixcloud's built-in player handles decryption)
        // Fall back to HLS if no embeds available
        const embedStream = streamData.all_streams.find(s => s.type === "embed");
        const hlsStream = streamData.all_streams.find(s => s.type === "hls" || (s.url && s.url.includes('.m3u8')));
        const currentStream = streamData.all_streams[activeSubServer] || streamData.all_streams[0];

        if (embedStream) {
            isIframe = true;
            currentIframeUrl = embedStream.url;
        } else if (currentStream) {
            if (currentStream.type === "hls" || currentStream.url.includes('.m3u8')) {
                const proxyBase = import.meta.env.VITE_PROXY_URL || 'https://anivexa-api.rafsanh983.workers.dev/api/proxy';
                videoSrc = `${proxyBase}?url=${encodeURIComponent(currentStream.url)}&referer=${encodeURIComponent(currentStream.referer || 'https://flixcloud.cc/')}`;
                videoType = "hls";
                isIframe = false;
            } else if (currentStream.type === "embed" || currentStream.url.includes('embed')) {
                isIframe = true;
                currentIframeUrl = currentStream.url;
            } else {
                videoSrc = currentStream.url;
                videoType = currentStream.type || "mp4";
                isIframe = false;
            }
        }
    } else if ((streamData?.sources && Array.isArray(streamData.sources) && streamData.sources.length > 0 && (!streamData?.iframe_url || isWatch2GetherMode)) || (activeServer === 2 && streamData?.sources)) {
        videoSrc = streamData.sources[0].url;
        videoType = streamData.sources[0].type;
    } else {
        isIframe = true;
    }

    const processedSubtitles = useMemo(() => {
        const subs = streamData?.subtitles || [];
        if (!isIframe) {
            // Deduplicate by URL to prevent UI collisions
            const uniqueSubs = [];
            const seenUrls = new Set();

            for (const sub of subs) {
                const subUrl = sub.file || sub.url;
                if (!seenUrls.has(subUrl)) {
                    seenUrls.add(subUrl);
                    uniqueSubs.push(sub);
                }
            }

            // Make English the default by sorting it to the top
            uniqueSubs.sort((a, b) => {
                const aLabel = (a.label || a.lang || a.language || '').toLowerCase();
                const bLabel = (b.label || b.lang || b.language || '').toLowerCase();
                if (aLabel.includes('english') || aLabel === 'en') return -1;
                if (bLabel.includes('english') || bLabel === 'en') return 1;
                return 0;
            });

            return uniqueSubs.map(sub => {
                const subUrl = sub.file || sub.url;
                return {
                    ...sub,
                    file: subUrl,
                    url: subUrl
                };
            });
        }
        return subs;
    }, [streamData?.subtitles, isIframe, anikoBase]);

    return (
        <>
            {/* Upcoming / Not Yet Released State */}
            {anime.status === "NOT_YET_RELEASED" ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center">
                    <img
                        src={anime.bannerImage || anime.coverImage?.extraLarge}
                        alt="Banner"
                        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm brightness-[0.3]"
                    />
                    <div className="relative z-10 flex flex-col items-center gap-6 max-w-md animate-in fade-in zoom-in duration-700">
                        <div className="w-20 h-20 bg-discord-600/10 rounded-3xl flex items-center justify-center border border-discord-600/20 ">
                            <svg
                                className="w-10 h-10 text-discord-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                                {t("watch.notYetReleased")}
                            </h2>
                            <p className="text-white/40 text-sm font-medium leading-relaxed">
                                This anime is scheduled to premiere soon. Bookmark it to get
                                notified when the first episode arrives!
                            </p>
                        </div>
                        {anime.nextAiringEpisode && (
                            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-discord-500 mb-1">
                                    {t("watch.estimatedArrival")}
                                </p>
                                <p className="text-lg font-bold text-white">
                                    Episode 1:{" "}
                                    {new Date(
                                        anime.nextAiringEpisode.airingAt * 1000
                                    ).toLocaleDateString(undefined, {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Loader & Error Overlay */}
                    {(streamLoading ||
                        (isIframe && !iframeLoaded) ||
                        (!streamLoading && fetchError) ||
                        (!streamLoading && !videoSrc && !isIframe)) && (
                            <div className="absolute inset-0 z-20 group">
                                <img
                                    src={currentEpisodeImage}
                                    alt="Poster"
                                    key={activeEpisode}
                                    className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 animate-in fade-in fill-mode-both ${fetchError || (!streamLoading && !videoSrc && !isIframe)
                                        ? "brightness-[0.7]"
                                        : "brightness-[0.4]"
                                        }`}
                                />
                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                                    {(streamLoading || (isIframe && !iframeLoaded)) &&
                                        activeServer !== 2 ? (
                                        <div className="flex flex-col items-center gap-4 transition-all duration-300">
                                            <div className="w-10 h-10 border-[3px] border-discord-600 border-t-transparent rounded-full animate-spin "></div>
                                            <p className="text-white/20 text-[8px] font-bold uppercase tracking-[0.3em] animate-pulse">
                                                {t("watch.loading")}
                                            </p>
                                        </div>
                                    ) : fetchError ? (
                                        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 bg-discord-600/10 rounded-full flex items-center justify-center border border-discord-600/20">
                                                <svg
                                                    className="w-8 h-8 text-discord-600"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-white font-bold text-lg uppercase tracking-tight">
                                                    {t("watch.streamUnavailable")}
                                                </p>
                                                <p className="text-white/40 text-xs max-w-[280px] mx-auto leading-relaxed">
                                                    {fetchError}
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => window.location.reload()}
                                                    className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    {t("watch.retry")}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setActiveServer((prev) =>
                                                            prev === 1 ? 2 : prev === 2 ? 3 : prev === 3 ? 4 : prev === 4 ? 5 : prev === 5 ? 6 : prev === 6 ? 7 : 1
                                                        )
                                                    }
                                                    className="px-5 py-2 bg-discord-600 hover:bg-discord-700 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"
                                                >
                                                    {t("watch.switchServer")}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}

                    {/* Server Rendering Logic */}
                    <div className="w-full h-full">
                        {!isIframe && videoSrc ? (
                            <div
                                className="w-full h-full"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                {videoType === 'hls' || videoSrc.includes('.m3u8') ? (
                                    <AnikoPlayer
                                        key={`anikoplayer-${activeServer}-${activeEpisode}-${activeSubServer}`}
                                        src={videoSrc}
                                        type={videoType}
                                        availableStreams={streamData?.all_streams || []}
                                        currentStreamIndex={activeSubServer}
                                        onStreamChange={(index) => setActiveSubServer(index)}
                                        poster={
                                            (anime?.coverImage?.extraLarge || anime?.coverImage?.large)
                                                ? `https://wsrv.nl/?url=${encodeURIComponent(anime?.coverImage?.extraLarge || anime?.coverImage?.large)}`
                                                : null
                                        }
                                        subtitles={processedSubtitles}
                                        skipTimes={skipTimes}
                                        initialTime={initialTime}
                                        onReady={() => setTimeout(() => setIframeLoaded(true), 0)}
                                        onEnded={() => {
                                            if (autoNext && activeEpisode < episodesList.length) {
                                                const nextEp = episodesList.find(
                                                    (e) => e.number === activeEpisode + 1
                                                );
                                                if (nextEp) setActiveEpisode(nextEp.number);
                                            }
                                        }}
                                        onError={onPlaybackError}
                                        ref={videoRef}
                                        onPlay={onPlay}
                                        onPause={onPause}
                                        onSeeked={onSeeked}
                                        disableControls={isWatch2GetherMode && !isW2GHost}
                                    />
                                ) : (
                                    <VideoPlayer
                                        key={`videoplayer-${activeServer}-${activeEpisode}-${activeSubServer}`}
                                        src={videoSrc}
                                        type={videoType}
                                        poster={
                                            (anime?.coverImage?.extraLarge || anime?.coverImage?.large)
                                                ? `https://wsrv.nl/?url=${encodeURIComponent(anime?.coverImage?.extraLarge || anime?.coverImage?.large)}`
                                                : null
                                        }
                                        subtitles={processedSubtitles}
                                        initialTime={initialTime}
                                        onReady={() => setTimeout(() => setIframeLoaded(true), 0)}
                                        onEnded={() => {
                                            if (autoNext && activeEpisode < episodesList.length) {
                                                const nextEp = episodesList.find(
                                                    (e) => e.number === activeEpisode + 1
                                                );
                                                if (nextEp) setActiveEpisode(nextEp.number);
                                            }
                                        }}
                                        ref={videoRef}
                                        onPlay={onPlay}
                                        onPause={onPause}
                                        onSeeked={onSeeked}
                                        disableControls={isWatch2GetherMode && !isW2GHost}
                                    />
                                )}
                            </div>
                        ) : (
                            <iframe
                                ref={iframeRef}
                                key={`${activeServer}-${activeEpisode}-${playerLang}-${activeSubServer}`}
                                src={currentIframeUrl || "about:blank"}
                                onLoad={() => {
                                    if (currentIframeUrl) setTimeout(() => setIframeLoaded(true), 0);
                                }}
                                className={`w-full h-full border-0 transition-opacity duration-500 ${!iframeLoaded ? "opacity-0" : "opacity-100"
                                    }`}
                                allowFullScreen
                                allowfullscreen="true"
                                webkitallowfullscreen="true"
                                mozallowfullscreen="true"
                                scrolling="no"
                                allow="autoplay; fullscreen *; encrypted-media; picture-in-picture; xr-spatial-tracking; clipboard-write"
                            />
                        )}
                    </div>
                </>
            )}
        </>
    );
}
