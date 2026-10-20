/**
 * Provider-independent catalog primitives shared by the edge SEO layer and
 * the persistent catalog service. Kept inside backend-core so standalone
 * backend deployments include the implementation.
 *
 * This module deliberately has no framework or database dependencies so the
 * same identity/slug rules are used by every runtime.
 */

export const SEO_SITE_URL = 'https://tenzora.top';

export const ANIME_FORMATS = Object.freeze([
  'TV',
  'TV_SHORT',
  'MOVIE',
  'OVA',
  'ONA',
  'SPECIAL',
]);

const FORMAT_ALIASES = new Map([
  ['SERIES', 'TV'],
  ['TVSERIES', 'TV'],
  ['FILM', 'MOVIE'],
  ['MUSIC', 'SPECIAL'],
]);

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
// Strip Latin combining accents without deleting script-significant vowel
// marks used by Devanagari and other Indic writing systems.
const LATIN_MARKS = /[\u0300-\u036f]/gu;
const NON_WORD_SEPARATOR = /[^\p{L}\p{N}\p{M}]+/gu;
const QUERY_MAX_LENGTH = 256;
const QUERY_MAX_TOKENS = 32;
const SEARCH_MARKERS = new Set([
  'episode', 'episodes', 'ep', 'eps', 'season', 'seasons', 'part', 'cour',
  'sub', 'subs', 'subbed', 'dub', 'dubbed', 'movie', 'movies', 'ova', 'ona', 'special',
]);
const MARKER_TYPOS = new Map([
  ['episod', 'episode'],
  ['episdoe', 'episode'],
  ['epiode', 'episode'],
  ['seasn', 'season'],
  ['seson', 'season'],
  ['seazon', 'season'],
  ['epsiode', 'episode'],
]);
const MARKER_ALIASES = new Map([
  ['حلقة', 'episode'], ['الحلقة', 'episode'], ['موسم', 'season'], ['الموسم', 'season'], ['جزء', 'part'],
  ['পর্ব', 'episode'], ['এপিসোড', 'episode'], ['সিজন', 'season'], ['অংশ', 'part'],
  ['एपिसोड', 'episode'], ['एपिसोड', 'episode'], ['सीजन', 'season'], ['सीज़न', 'season'], ['भाग', 'part'],
  ['エピソード', 'episode'], ['シーズン', 'season'], ['パート', 'part'],
]);

const TEXT_VALUE_KEYS = [
  'english', 'en', 'userPreferred', 'canonical', 'romaji',
  'full', 'name', 'native', 'ja', 'ja_jp', 'en_us',
  'title', 'value', 'text', 'content', 'description', 'overview', 'synopsis',
];

function textValue(value, preferredKeys = []) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => textValue(item, preferredKeys)).find(Boolean) || '';
  }
  if (typeof value !== 'object') return '';

  const keys = [...new Set([...preferredKeys, ...TEXT_VALUE_KEYS])];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const result = textValue(value[key], preferredKeys);
      if (result) return result;
    }
  }
  return '';
}

export function normalizeText(value, { maxLength = 512 } = {}) {
  return textValue(value)
    .normalize('NFKC')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Search normalization preserves Bengali, Arabic, Hindi, Japanese and other
 * scripts while making case, accents, punctuation and whitespace equivalent.
 */
export function normalizeSearchText(value, { maxLength = 512 } = {}) {
  return normalizeText(value, { maxLength })
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(LATIN_MARKS, '')
    .replace(NON_WORD_SEPARATOR, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function levenshtein(left, right, maxDistance = 3) {
  if (left === right) return 0;
  if (!left || !right) return Math.max(left.length, right.length);
  if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let minimum = current[0];
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );
      minimum = Math.min(minimum, current[column]);
    }
    if (minimum > maxDistance) return maxDistance + 1;
    previous = current;
  }
  return previous[right.length];
}

export function fuzzyTokenMatch(value, candidates, { maxDistance = 2 } = {}) {
  const normalized = normalizeSearchText(value, { maxLength: 64 });
  if (!normalized) return null;
  let best = null;
  for (const candidate of candidates || []) {
    const normalizedCandidate = normalizeSearchText(candidate, { maxLength: 64 });
    const distance = levenshtein(normalized, normalizedCandidate, maxDistance);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { value: candidate, distance };
    }
  }
  return best;
}

function tokenizeSearchInput(source) {
  return normalizeSearchText(source, { maxLength: QUERY_MAX_LENGTH })
    .split(' ')
    .filter(Boolean)
    .slice(0, QUERY_MAX_TOKENS);
}

function markerName(token) {
  const normalized = normalizeSearchText(token, { maxLength: 32 });
  if (MARKER_ALIASES.has(normalized)) return MARKER_ALIASES.get(normalized);
  if (SEARCH_MARKERS.has(normalized)) return normalized;
  return MARKER_TYPOS.get(normalized) || null;
}

function numberAfterMarker(tokens, index) {
  const value = tokens[index + 1] || '';
  const match = value.match(/^(?:#|e)?(\d{1,5})$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Parse user intent after title resolution has been separated from the
 * existing browse-filter parser. The parser is deliberately bounded and
 * never evaluates arbitrary expressions or treats a provider ID as a title.
 */
export function parseSearchIntent(input = '') {
  const raw = String(input ?? '');
  const normalized = normalizeText(raw, { maxLength: QUERY_MAX_LENGTH + 1 });
  const rejected = raw.length > QUERY_MAX_LENGTH || normalized.length > QUERY_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(raw);
  if (rejected) {
    return {
      raw: '', title: '', normalizedTitle: '', tokens: [], episode: null, season: null,
      part: null, audio: null, format: null, rejected: true, reason: 'query_too_large_or_invalid',
    };
  }

  const tokens = tokenizeSearchInput(normalized);
  const titleTokens = [];
  const result = {
    raw: normalized,
    title: '',
    normalizedTitle: '',
    tokens,
    episode: null,
    season: null,
    part: null,
    audio: null,
    format: null,
    rejected: false,
    reason: null,
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const marker = markerName(token);
    const compactEpisode = token.match(/^(?:e|ep)(\d{1,5})$/i);
    const standaloneSeason = token.match(/^s(\d{1,3})$/i);
    const standalonePart = token.match(/^p(?:art)?(\d{1,3})$/i);
    const compactSeasonEpisode = token.match(/^s(\d{1,3})e(\d{1,5})$/i);
    const compactXEpisode = token.match(/^(\d{1,3})x(\d{1,5})$/i);
    const localizedEpisode = token.match(/^(?:第)?(\d{1,5})(?:話|화)$/u);
    const localizedSeason = token.match(/^(?:シーズン|सीजन|सीज़न)(\d{1,3})$/u);
    if (localizedEpisode) { result.episode = Number(localizedEpisode[1]); continue; }
    if (localizedSeason) { result.season = Number(localizedSeason[1]); continue; }
    if (compactSeasonEpisode) { result.season = Number(compactSeasonEpisode[1]); result.episode = Number(compactSeasonEpisode[2]); continue; }
    if (compactXEpisode) { result.season = Number(compactXEpisode[1]); result.episode = Number(compactXEpisode[2]); continue; }
    if (compactEpisode) { result.episode = Number(compactEpisode[1]); continue; }
    if (standaloneSeason) { result.season = Number(standaloneSeason[1]); continue; }
    if (standalonePart) { result.part = Number(standalonePart[1]); continue; }

    if (marker === 'episode' || marker === 'episodes' || marker === 'ep' || marker === 'eps') {
      const value = numberAfterMarker(tokens, index);
      if (value !== null) { result.episode = value; index += 1; continue; }
    }
    if (marker === 'season' || marker === 'seasons') {
      const value = numberAfterMarker(tokens, index);
      if (value !== null) { result.season = value; index += 1; continue; }
    }
    if (marker === 'part' || marker === 'cour') {
      const value = numberAfterMarker(tokens, index);
      if (value !== null) { result.part = value; index += 1; continue; }
    }
    if (marker === 'sub' || marker === 'subs' || marker === 'subbed') { result.audio = 'SUB'; continue; }
    if (marker === 'dub' || marker === 'dubbed') { result.audio = 'DUB'; continue; }
    if (marker === 'movie' || marker === 'movies') { result.format = 'MOVIE'; continue; }
    if (marker === 'ova' || marker === 'ona' || marker === 'special') { result.format = marker.toUpperCase(); continue; }

    // Accept "3rd season" and "10th episode" forms.
    const ordinal = token.match(/^(\d{1,5})(?:st|nd|rd|th)$/i);
    const nextMarker = markerName(tokens[index + 1] || '');
    if (ordinal && (nextMarker === 'episode' || nextMarker === 'episodes' || nextMarker === 'ep')) {
      result.episode = Number(ordinal[1]); index += 1; continue;
    }
    if (ordinal && (nextMarker === 'season' || nextMarker === 'seasons')) {
      result.season = Number(ordinal[1]); index += 1; continue;
    }
    titleTokens.push(token);
  }

  result.title = titleTokens.join(' ');
  if (result.episode === null && titleTokens.length > 1) {
    const trailingNumber = titleTokens[titleTokens.length - 1].match(/^(\d{1,5})$/);
    if (trailingNumber) {
      result.episode = Number(trailingNumber[1]);
      titleTokens.pop();
      result.title = titleTokens.join(' ');
    }
  }
  result.normalizedTitle = normalizeSearchText(result.title, { maxLength: QUERY_MAX_LENGTH });
  if (!result.title && !result.episode && !result.season && !result.part) {
    result.rejected = true;
    result.reason = 'missing_title_or_intent';
  }
  if (result.episode !== null && (result.episode < 1 || result.episode > 100000)) {
    result.rejected = true;
    result.reason = 'invalid_episode';
  }
  if (result.season !== null && (result.season < 1 || result.season > 1000)) {
    result.rejected = true;
    result.reason = 'invalid_season';
  }
  return result;
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function shortHash(value, length = 8) {
  return hashText(value).slice(0, length).padEnd(length, '0');
}

/**
 * Slugs are ASCII where possible. A hash fallback keeps native-only titles
 * addressable without using a provider ID as the URL identity.
 */
export function slugifyTitle(value) {
  const ascii = normalizeText(value)
    .normalize('NFKD')
    .replace(LATIN_MARKS, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return ascii.slice(0, 96);
}

export function normalizeFormat(value) {
  const format = normalizeText(value, { maxLength: 32 }).toUpperCase().replace(/[-\s]+/g, '_');
  if (ANIME_FORMATS.includes(format)) return format;
  return FORMAT_ALIASES.get(format) || 'TV';
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'object' && value.year) {
    const year = numberOrNull(value.year);
    const month = numberOrNull(value.month) || 1;
    const day = numberOrNull(value.day) || 1;
    if (!year) return null;
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }
  return null;
}

function providerId(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim();
  return normalized && normalized.length <= 128 ? normalized : null;
}

function titleValues(media) {
  const title = media?.title && typeof media.title === 'object' ? media.title : {};
  const values = [
    title.canonical,
    title.english,
    title.romaji,
    title.userPreferred,
    title.native,
    media?.canonicalTitle,
    ...(Array.isArray(media?.synonyms) ? media.synonyms : []),
    ...(Array.isArray(media?.alternativeTitles) ? media.alternativeTitles : []),
  ];

  if (media?.localizedTitles && typeof media.localizedTitles === 'object') {
    values.push(...Object.values(media.localizedTitles));
  }

  return [...new Set(values.map((value) => normalizeText(value, { maxLength: 256 })).filter(Boolean))];
}

function getPrimaryTitle(media, titles) {
  const title = media?.title && typeof media.title === 'object' ? media.title : {};
  return normalizeText(
    title.canonical || title.english || title.romaji || title.userPreferred || title.native || titles[0] || 'Untitled Anime',
    { maxLength: 256 },
  );
}

function providerIdsFor(media) {
  const isMal = Boolean(media?.isMAL || media?.source === 'mal' || media?.provider === 'mal');
  return {
    anilist: providerId(media?.providerIds?.anilist || media?.anilistId || (!isMal ? media?.id : null)),
    mal: providerId(media?.providerIds?.mal || media?.idMal || (isMal ? media?.id : null)),
    kitsu: providerId(media?.kitsuId || media?.providerIds?.kitsu),
    aniZip: providerId(media?.aniZipId || media?.providerIds?.aniZip),
  };
}

function dateYear(media) {
  return numberOrNull(media?.seasonYear || media?.startDate?.year || media?.year);
}

function normalizeEpisode(episode) {
  if (!episode || typeof episode !== 'object') return null;
  const number = numberOrNull(episode.number ?? episode.episode ?? episode.mal_id);
  if (!number || number < 0 || number > 100000) return null;
  const description = normalizeText(
    textValue(episode.description, ['en', 'english', 'overview', 'description'])
      || textValue(episode.synopsis, ['en', 'english', 'overview', 'description']),
    { maxLength: 1000 },
  );
  const title = normalizeText(
    textValue(episode.title, ['en', 'english', 'title'])
      || textValue(episode.name, ['en', 'english', 'title']),
    { maxLength: 256 },
  );
  const thumbnail = textValue(episode.thumbnail, ['original', 'large', 'medium', 'small'])
    || textValue(episode.image, ['original', 'large', 'medium', 'small']);
  const duration = numberOrNull(episode.duration);
  const airDate = dateValue(episode.airDate || episode.aired || episode.releaseDate);
  return {
    number,
    title: title || null,
    description: description || null,
    thumbnail,
    duration: duration && duration > 0 && duration <= 1440 ? duration : null,
    airDate,
    available: episode.available !== false,
    uniqueMetadata: Boolean((title && !/^(?:episode|ep)\s*\d+$/i.test(title)) || description.length >= 40 || thumbnail || airDate || duration),
    updatedAt: dateValue(episode.updatedAt) || null,
  };
}

function normalizeCharacter(character) {
  if (!character || typeof character !== 'object') return null;
  const name = character.name && typeof character.name === 'object' ? character.name : character;
  const names = [
    ...(Array.isArray(character.names) ? character.names : []),
    name.full,
    name.userPreferred,
    name.native,
    character.full,
    character.native,
  ]
    .map(value => normalizeText(value, { maxLength: 256 }))
    .filter(Boolean);
  if (!names.length) return null;
  return {
    id: providerId(character.id),
    names: [...new Set(names)],
    aliases: [...new Set(names.map(normalizeSearchText).filter(Boolean))],
    slug: buildCharacterSlug(names[0], providerId(character.id) || ''),
    image: typeof character.image === 'string'
      ? character.image.slice(0, 2048)
      : typeof character.image?.large === 'string' ? character.image.large.slice(0, 2048) : null,
  };
}

export function buildCanonicalId({ primaryTitle, format, year, season, part }) {
  const signature = [
    normalizeSearchText(primaryTitle),
    normalizeFormat(format),
    year || '',
    normalizeText(season, { maxLength: 32 }).toUpperCase(),
    part || '',
  ].join('|');
  return `anime-${shortHash(signature, 12)}`;
}

export function buildAnimeSlug(primaryTitle, canonicalId) {
  const base = slugifyTitle(primaryTitle) || `anime-${shortHash(primaryTitle, 8)}`;
  return `${base}--${shortHash(canonicalId, 8)}`.slice(0, 120);
}

export function buildCharacterSlug(name, id = '') {
  const base = slugifyTitle(name) || `character-${shortHash(name, 8)}`;
  const identity = id || normalizeSearchText(name);
  return `${base}--${shortHash(identity, 8)}`.slice(0, 120);
}

export function normalizeAnime(media, { fetchedAt = new Date().toISOString() } = {}) {
  if (!media || typeof media !== 'object') return null;
  const titles = titleValues(media);
  const primaryTitle = getPrimaryTitle(media, titles);
  const format = normalizeFormat(media.format || media.type);
  const year = dateYear(media);
  const season = normalizeText(media.season, { maxLength: 32 }).toUpperCase() || null;
  const seasonNumber = numberOrNull(media.seasonNumber || media.seasonNo || media.seasonIndex);
  const part = numberOrNull(media.part || media.partNumber || media.cour);
  const canonicalId = normalizeText(media.canonicalId, { maxLength: 128 }) || buildCanonicalId({ primaryTitle, format, year, season, part });
  const providerIds = providerIdsFor(media);
  const episodes = (Array.isArray(media.episodeList) ? media.episodeList : Array.isArray(media.episodesList) ? media.episodesList : [])
    .map(normalizeEpisode)
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
  const characterSource = Array.isArray(media.characters)
    ? media.characters
    : Array.isArray(media.characterList)
      ? media.characterList
      : media.characters?.edges?.map(edge => ({ ...edge?.node, role: edge?.role })) || [];
  const characters = characterSource.map(normalizeCharacter).filter(Boolean).slice(0, 100);
  const episodeCount = numberOrNull(media.episodeCount ?? (typeof media.episodes === 'number' ? media.episodes : null)) || (episodes.length || null);
  const description = normalizeText(media.description, { maxLength: 3000 });
  const image = media.coverImage?.extraLarge || media.coverImage?.large || media.image || null;
  const bannerImage = media.bannerImage || null;
  const metadataState = media.metadataState || (primaryTitle && (description || image) ? 'complete' : 'partial');
  const slug = normalizeText(media.slug, { maxLength: 120 }) || buildAnimeSlug(primaryTitle, canonicalId);

  return {
    canonicalId,
    slug,
    canonicalUrl: `${SEO_SITE_URL}/anime/${encodeURIComponent(slug)}`,
    providerIds,
    titles: {
      canonical: primaryTitle,
      english: normalizeText(media.title?.english, { maxLength: 256 }) || null,
      romaji: normalizeText(media.title?.romaji, { maxLength: 256 }) || null,
      native: normalizeText(media.title?.native, { maxLength: 256 }) || null,
      userPreferred: normalizeText(media.title?.userPreferred, { maxLength: 256 }) || null,
      synonyms: titles.filter((title) => title !== primaryTitle).slice(0, 64),
      localized: media.localizedTitles && typeof media.localizedTitles === 'object' ? media.localizedTitles : {},
    },
    searchAliases: [...new Set(titles.map(normalizeSearchText).filter(Boolean))].slice(0, 80),
    format,
    season,
    seasonNumber,
    seasonYear: year,
    part,
    description: description || null,
    image: typeof image === 'string' ? image.slice(0, 2048) : null,
    bannerImage: typeof bannerImage === 'string' ? bannerImage.slice(0, 2048) : null,
    episodeCount,
    episodes,
    characters,
    characterAliases: [...new Set(characters.flatMap(character => character.aliases))].slice(0, 300),
    metadataState,
    indexable: media.indexable !== false && Boolean(primaryTitle),
    lastFetchedAt: fetchedAt,
    lastEpisodeUpdatedAt: episodes.reduce((latest, episode) => episode.updatedAt && (!latest || episode.updatedAt > latest) ? episode.updatedAt : latest, null),
  };
}

// One eligibility policy is used by both HTML and sitemaps. Generic episode
// labels and provider counts alone are not useful episode landing content.
export function isUsefulAnime(entry) {
  return Boolean(entry?.indexable && entry.metadataState !== 'error' && entry.titles?.canonical
    && entry.titles.canonical !== 'Untitled Anime' && entry.description?.length >= 40);
}

export function isUsefulEpisode(episode, now = Date.now()) {
  if (!episode?.available || !Number.isInteger(Number(episode.number)) || Number(episode.number) < 1) return false;
  if (episode.airDate && new Date(episode.airDate).getTime() > now) return false;
  return Boolean((episode.title && !/^(?:episode|ep)\s*\d+$/i.test(episode.title)) || episode.description?.length >= 40);
}

export function mergeCatalogEntry(existing, incoming) {
  if (!existing) return incoming;
  const merged = { ...existing, ...incoming };
  for (const key of ['canonicalId', 'slug', 'canonicalUrl']) merged[key] = existing[key];
  for (const key of ['description', 'image', 'bannerImage', 'season', 'seasonYear', 'seasonNumber', 'part']) {
    if (incoming[key] == null || incoming[key] === '') merged[key] = existing[key];
  }
  merged.providerIds = { ...existing.providerIds };
  for (const [key, value] of Object.entries(incoming.providerIds || {})) if (value) merged.providerIds[key] = value;
  merged.titles = { ...existing.titles };
  for (const [key, value] of Object.entries(incoming.titles || {})) {
    if (value && key !== 'synonyms' && key !== 'localized') merged.titles[key] = value;
  }
  merged.titles.synonyms = [...new Set([...(existing.titles?.synonyms || []), ...(incoming.titles?.synonyms || [])])].slice(0, 64);
  merged.titles.localized = { ...existing.titles?.localized, ...incoming.titles?.localized };
  merged.searchAliases = [...new Set([...(existing.searchAliases || []), ...(incoming.searchAliases || [])])].slice(0, 80);
  const episodes = new Map((existing.episodes || []).map(episode => [Number(episode.number), episode]));
  for (const episode of incoming.episodes || []) {
    const old = episodes.get(Number(episode.number));
    const next = { ...old, ...episode };
    for (const key of ['title', 'description', 'thumbnail', 'duration', 'airDate', 'updatedAt']) {
      if (episode[key] == null) next[key] = old?.[key] || null;
    }
    next.uniqueMetadata = isUsefulEpisode(next);
    episodes.set(Number(episode.number), next);
  }
  merged.episodes = [...episodes.values()].sort((a, b) => a.number - b.number);
  const highestEpisode = Math.max(0, ...merged.episodes.map(episode => Number(episode.number) || 0));
  merged.episodeCount = Math.max(Number(incoming.episodeCount || 0), Number(existing.episodeCount || 0), highestEpisode) || null;
  const characters = new Map((existing.characters || []).map(character => [character.id || character.slug, character]));
  for (const character of incoming.characters || []) characters.set(character.id || character.slug, character);
  merged.characters = [...characters.values()].slice(0, 100);
  merged.characterAliases = [...new Set(merged.characters.flatMap(character => character.aliases || []))].slice(0, 300);
  if (incoming.metadataState === 'partial' && existing.metadataState === 'complete') merged.metadataState = 'complete';
  merged.lastEpisodeUpdatedAt = existing.lastEpisodeUpdatedAt || incoming.lastEpisodeUpdatedAt || null;
  return merged;
}

export function catalogComparable(entry) {
  if (!entry) return '';
  const copy = JSON.parse(JSON.stringify(entry));
  for (const key of ['_id', '__v', 'lastFetchedAt', 'lastEpisodeUpdatedAt', 'contentUpdatedAt', 'revision', 'updatedAt', 'createdAt']) delete copy[key];
  if (copy.episodes) copy.episodes = copy.episodes.map((episode) => {
    const item = { ...episode };
    delete item.updatedAt;
    return item;
  });
  return JSON.stringify(copy);
}

export function getEpisode(entry, number) {
  const target = Number(number);
  if (!Number.isFinite(target)) return null;
  return entry?.episodes?.find((episode) => Number(episode.number) === target) || null;
}
