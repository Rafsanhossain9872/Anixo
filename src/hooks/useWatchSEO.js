import { useEffect } from "react";
import { updateMetaTags, updateStructuredData, clearStructuredData } from "../utils/seo";

/**
 * useWatchSEO
 * Updates page meta tags and Schema.org structured data
 * whenever the anime or active episode changes.
 * Cleans up on unmount.
 */
export function useWatchSEO({ anime, activeEpisode, getTitle, id, isMal }) {
  useEffect(() => {
    if (!anime) return;

    const title = getTitle(anime.title) || "Watch Anime";
    const coverImage =
      anime.bannerImage ||
      anime.coverImage?.extraLarge ||
      anime.coverImage?.large;
    const descText = anime.description
      ? anime.description.replace(/<[^>]+>/g, "").substring(0, 160)
      : "Watch this anime online for free in high quality.";

    const epTitle = `Episode ${activeEpisode}`;
    const pageTitle = `Watch ${title} ${epTitle} English Sub/Dub`;
    const pageKeywords = `${title}, ${title} ${epTitle}, watch ${title} online, ${title} english sub, ${title} english dub, tenzora, free anime streaming`;

    // Update Meta Tags
    updateMetaTags({
      title: pageTitle,
      description: `Watch ${title} ${epTitle} English Sub/Dub in High Quality. ${descText}`,
      image: coverImage,
      keywords: pageKeywords,
      type: "video.episode",
      url: `/watch/${id}?ep=${activeEpisode}${isMal ? "&mal=true" : ""}`,
      anilistId: isMal ? null : id,
      malId: anime?.idMal || (isMal ? id : null),
      episode: activeEpisode,
    });

    // Generate Schema.org structured data for this Episode + VideoObject
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "TVEpisode",
        episodeNumber: activeEpisode,
        name: `${title} - ${epTitle}`,
        image: coverImage,
        partOfSeries: {
          "@type": "TVSeries",
          name: title,
          image: coverImage,
          description: descText,
          url: `${import.meta.env.VITE_SITE_URL || "https://tenzora.top"}/watch/${id}`,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${title} ${epTitle} Sub/Dub`,
        description: `Stream ${title} ${epTitle} for free on Tenzora.`,
        thumbnailUrl: coverImage,
        uploadDate: new Date().toISOString(),
        contentUrl: window.location.href,
        embedUrl: window.location.href,
        interactionCount: "1000",
        potentialAction: {
          "@type": "SeekAction",
          target: `${window.location.href}&t={seek_to_second_number}`,
          "startOffset-input": "required name=seek_to_second_number",
        },
      },
    ];

    updateStructuredData(schema);

    // Cleanup when leaving component
    return () => {
      clearStructuredData();
      updateMetaTags({
        title: "Watch Free Anime Online, Stream Subbed & Dubbed HD",
        description:
          "TenZora is the best website to watch anime online for free. Watch trending, popular, and new releases with SUB, DUB in HD quality. No Ads Guaranteed! WATCH NOW!",
        url: "/",
      });
    };
  }, [anime, activeEpisode, getTitle, id, isMal]);
}
