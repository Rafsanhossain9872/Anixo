import express from 'express';
import process from 'node:process';
import { timingSafeEqual } from 'node:crypto';
import SeoCatalogEntry from '../models/SeoCatalogEntry.js';
import SeoCatalogState from '../models/SeoCatalogState.js';
import {
  SEO_SITE_URL,
  catalogComparable,
  mergeCatalogEntry,
  normalizeAnime,
  fuzzyTokenMatch,
  normalizeSearchText,
  normalizeText,
  parseSearchIntent,
  shortHash,
} from '../models/seoCatalogModel.mjs';
import User from '../models/User.js';
import Progress from '../models/Progress.js';

const router = express.Router();

function sameSecret(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function internalCatalogAuth(req, res, next) {
  const configuredSecret = process.env.INTERNAL_SERVICE_SECRET || process.env.CRON_SECRET;
  const authorization = req.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const suppliedSecret = req.get('x-seo-catalog-secret') || bearer;

  if (configuredSecret && sameSecret(configuredSecret, suppliedSecret)) return next();
  if (!configuredSecret && process.env.NODE_ENV !== 'production' && process.env.LOCAL_PREVIEW === 'true') return next();
  return res.status(401).json({ success: false, message: 'Catalog authorization required' });
}

function publicEntry(entry) {
  if (!entry) return null;
  const value = typeof entry.toObject === 'function' ? entry.toObject() : entry;
  return {
    canonicalId: value.canonicalId,
    slug: value.slug,
    canonicalUrl: `${SEO_SITE_URL}/anime/${encodeURIComponent(value.slug)}`,
    providerIds: value.providerIds,
    titles: value.titles,
    searchAliases: value.searchAliases,
    format: value.format,
    season: value.season,
    seasonNumber: value.seasonNumber,
    seasonYear: value.seasonYear,
    part: value.part,
    description: value.description,
    image: value.image,
    bannerImage: value.bannerImage,
    episodeCount: value.episodeCount,
    episodes: value.episodes,
    characters: value.characters,
    characterAliases: value.characterAliases,
    metadataState: value.metadataState,
    indexable: value.indexable,
    revision: value.revision,
    lastFetchedAt: value.lastFetchedAt,
    lastEpisodeUpdatedAt: value.lastEpisodeUpdatedAt,
    updatedAt: value.updatedAt,
    contentUpdatedAt: value.contentUpdatedAt,
  };
}

const sitemapEligibilityQuery = {
  indexable: true,
  metadataState: { $ne: 'error' },
  'titles.canonical': { $exists: true, $nin: ['', 'Untitled Anime'] },
  description: { $type: 'string', $regex: /.{40,}/ },
};

function normalizePayload(payload) {
  if (payload?.titles?.canonical) {
    return normalizeAnime({
      canonicalId: payload.canonicalId,
      slug: payload.slug,
      title: payload.titles,
      synonyms: payload.titles.synonyms,
      localizedTitles: payload.titles.localized,
      providerIds: payload.providerIds,
      anilistId: payload.providerIds?.anilist,
      idMal: payload.providerIds?.mal,
      kitsuId: payload.providerIds?.kitsu,
      aniZipId: payload.providerIds?.aniZip,
      format: payload.format,
      season: payload.season,
      seasonNumber: payload.seasonNumber,
      seasonYear: payload.seasonYear,
      part: payload.part,
      description: payload.description,
      image: payload.image,
      bannerImage: payload.bannerImage,
      episodeCount: payload.episodeCount,
      episodeList: payload.episodes,
      characters: payload.characters,
      metadataState: payload.metadataState,
      indexable: payload.indexable,
    });
  }
  return normalizeAnime(payload);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreAlias(query, alias) {
  const normalizedAlias = normalizeSearchText(alias, { maxLength: 256 });
  if (!normalizedAlias) return 0;
  if (normalizedAlias === query) return 120;
  if (normalizedAlias.startsWith(query)) return 100;
  if (normalizedAlias.includes(query)) return 80;
  const queryTokens = query.split(' ').filter(Boolean);
  const aliasTokens = normalizedAlias.split(' ').filter(Boolean);
  let score = 0;
  for (const token of queryTokens) {
    if (aliasTokens.includes(token)) score += 24;
    else if (fuzzyTokenMatch(token, aliasTokens, { maxDistance: token.length > 4 ? 2 : 1 })) score += 12;
  }
  return score / Math.max(queryTokens.length, 1);
}

function scoreEntry(entry, intent) {
  const aliases = entry.searchAliases || [];
  const characterAliases = entry.characterAliases || [];
  const query = intent.normalizedTitle;
  const animeScore = Math.max(0, ...aliases.map(alias => scoreAlias(query, alias)));
  const characterScore = Math.max(0, ...characterAliases.map(alias => scoreAlias(query, alias))) * 0.92;
  let score = Math.max(animeScore, characterScore);
  if (intent.format && entry.format === intent.format) score += 10;
  if (intent.season !== null && entry.seasonNumber === intent.season) score += 14;
  if (intent.part !== null && entry.part === intent.part) score += 14;
  if (intent.episode !== null && entry.episodes?.some(episode => Number(episode.number) === intent.episode)) score += 8;
  return { score, matchType: characterScore > animeScore ? 'character' : 'anime' };
}

function resultEntry(entry, intent, scoreData) {
  const value = publicEntry(entry);
  const matchedCharacter = (value.characters || []).find(character =>
    (character.aliases || []).some(alias => scoreAlias(intent.normalizedTitle, alias) >= 80));
  return {
    ...value,
    matchType: scoreData.matchType,
    matchScore: Math.round(scoreData.score * 100) / 100,
    matchedCharacter: matchedCharacter || null,
    intent: {
      episode: intent.episode,
      season: intent.season,
      part: intent.part,
      audio: intent.audio,
      format: intent.format,
    },
  };
}

async function bumpCatalogRevision() {
  await SeoCatalogState.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' }, $inc: { revision: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function persistEntry(payload) {
  const incoming = normalizePayload(payload);
  if (!incoming || incoming.titles.canonical === 'Untitled Anime') throw new TypeError('Invalid catalog payload');
  const identities = Object.entries(incoming.providerIds).filter(([, id]) => id).map(([provider, id]) => ({ [`providerIds.${provider}`]: id }));
  // Compare-and-swap protects simultaneous metadata and episode ingestion.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const existing = await SeoCatalogEntry.findOne({ $or: [{ canonicalId: incoming.canonicalId }, ...identities] }).lean();
    const old = existing ? normalizePayload(publicEntry(existing)) : null;
    const normalized = mergeCatalogEntry(old, incoming);
    const conflict = await SeoCatalogEntry.findOne({ slug: normalized.slug, canonicalId: { $ne: normalized.canonicalId } }).lean();
    if (conflict) {
      normalized.canonicalId = `${normalized.canonicalId}-${shortHash(JSON.stringify(incoming.providerIds))}`;
      normalized.slug = `${normalized.slug}-${shortHash(normalized.canonicalId)}`.slice(0, 120);
      normalized.canonicalUrl = `${SEO_SITE_URL}/anime/${normalized.slug}`;
    }
    const changed = !existing || catalogComparable(old) !== catalogComparable(normalized);
    const now = new Date();
    const update = {
      ...normalized,
      lastFetchedAt: now,
      revision: (existing?.revision || 0) + (changed ? 1 : 0),
      contentUpdatedAt: changed ? now : existing.contentUpdatedAt || existing.updatedAt,
      lastEpisodeUpdatedAt: changed && incoming.episodes.length ? now : existing?.lastEpisodeUpdatedAt || null,
    };
    try {
      const saved = existing
        ? await SeoCatalogEntry.findOneAndUpdate({ _id: existing._id, revision: existing.revision }, { $set: update }, { new: true, runValidators: true })
        : await SeoCatalogEntry.create(update);
      if (!saved) continue;
      if (changed) await bumpCatalogRevision();
      return { entry: publicEntry(saved), changed };
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  throw new Error('Catalog write contention; retry the request');
}

function sourceAnimeReference(item) {
  const rawAnimeId = normalizeText(item?.animeId, { maxLength: 128 });
  const normalizedId = rawAnimeId.replace(/^mal:/i, '');
  const isMal = Boolean(item?.isMAL) || /^mal:/i.test(rawAnimeId);
  const anilistId = normalizeText(item?.anilistId, { maxLength: 128 })
    || (!isMal && /^\d{1,12}$/u.test(normalizedId) ? normalizedId : null);
  const malId = normalizeText(item?.idMal, { maxLength: 128 })
    || (isMal && /^\d{1,12}$/u.test(normalizedId) ? normalizedId : null);
  const title = normalizeText(item?.title, { maxLength: 256 });
  if (!anilistId && !malId && !title) return null;

  const identity = anilistId
    ? `anilist:${anilistId}`
    : malId
      ? `mal:${malId}`
      : `title:${normalizeSearchText(title)}`;
  return { identity, anilistId, malId, title };
}

router.get('/source/anime', internalCatalogAuth, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(1000, Number.parseInt(req.query.limit, 10) || 1000));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const [userReferences, progressReferences] = await Promise.all([
      User.aggregate([
        { $project: { items: { $concatArrays: [{ $ifNull: ['$watchlist', []] }, { $ifNull: ['$continueWatching', []] }] } } },
        { $unwind: '$items' },
        { $replaceWith: '$items' },
        { $project: { animeId: 1, anilistId: 1, idMal: 1, isMAL: 1, title: 1 } },
      ]),
      Progress.aggregate([
        { $project: { animeId: 1, anilistId: 1, idMal: 1, isMAL: 1, title: 1 } },
      ]),
    ]);

    const references = new Map();
    for (const item of [...userReferences, ...progressReferences]) {
      const reference = sourceAnimeReference(item);
      if (!reference) continue;
      const existing = references.get(reference.identity);
      if (existing) existing.occurrences += 1;
      else references.set(reference.identity, { ...reference, occurrences: 1 });
    }

    const all = [...references.values()].sort((left, right) => right.occurrences - left.occurrences || left.identity.localeCompare(right.identity));
    const items = all.slice(offset, offset + limit).map(reference => Object.fromEntries(
      Object.entries(reference).filter(([key]) => key !== 'identity' && key !== 'occurrences'),
    ));
    return res.json({
      success: true,
      items,
      total: all.length,
      offset,
      limit,
      hasNextPage: offset + items.length < all.length,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/resolve/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 120);
    const entry = await SeoCatalogEntry.findOne({ slug, indexable: true }).lean();
    if (!entry) return res.status(404).json({ success: false, message: 'Catalog entry not found' });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, entry: publicEntry(entry) });
  } catch (error) {
    return next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const rawQuery = String(req.query.q || '');
    const intent = parseSearchIntent(rawQuery);
    if (intent.rejected || !intent.normalizedTitle) {
      return res.status(400).json({ success: false, message: intent.reason || 'Invalid search query', intent });
    }

    const terms = intent.normalizedTitle.split(' ').filter(Boolean).slice(0, 12);
    const regexTerms = terms.map(term => new RegExp(escapeRegex(term), 'i'));
    const phrase = new RegExp(escapeRegex(intent.normalizedTitle), 'i');
    const query = {
      indexable: true,
      metadataState: { $ne: 'error' },
      $or: [
        { searchAliases: phrase },
        { characterAliases: phrase },
        ...regexTerms.flatMap(regex => ([{ searchAliases: regex }, { characterAliases: regex }])),
      ],
    };
    let candidates = await SeoCatalogEntry.find(query).limit(250).lean();
    // A typo in every title token cannot be found by token prefiltering. Use
    // a bounded fuzzy fallback rather than issuing an unbounded collection
    // scan or forwarding the raw query to a provider.
    if (!candidates.length) {
      candidates = await SeoCatalogEntry.find({ indexable: true, metadataState: { $ne: 'error' } }).limit(500).lean();
    }
    const results = candidates
      .map(entry => ({ entry, scoreData: scoreEntry(entry, intent) }))
      .filter(({ scoreData }) => scoreData.score >= (intent.normalizedTitle.length <= 3 ? 70 : 10))
      .sort((left, right) => right.scoreData.score - left.scoreData.score || String(left.entry.slug).localeCompare(String(right.entry.slug)))
      .slice(0, 20)
      .map(({ entry, scoreData }) => resultEntry(entry, intent, scoreData));

    res.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
    return res.json({ success: true, query: intent, results });
  } catch (error) {
    return next(error);
  }
});

router.get('/provider/:provider/:id', async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    const id = String(req.params.id || '').slice(0, 128);
    if (!['anilist', 'mal', 'kitsu', 'anizip'].includes(provider) || !id) {
      return res.status(400).json({ success: false, message: 'Invalid provider identity' });
    }
    const entry = await SeoCatalogEntry.findOne({ [`providerIds.${provider === 'anizip' ? 'aniZip' : provider}`]: id, indexable: true }).lean();
    if (!entry) return res.status(404).json({ success: false, message: 'Catalog entry not found' });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, entry: publicEntry(entry) });
  } catch (error) {
    return next(error);
  }
});

router.get('/version', async (req, res, next) => {
  try {
    const state = await SeoCatalogState.findOne({ key: 'global' }).lean();
    const count = await SeoCatalogEntry.countDocuments(sitemapEligibilityQuery);
    res.set('Cache-Control', 'no-store');
    res.set('X-Catalog-Revision', String(state?.revision || 0));
    return res.json({ success: true, revision: state?.revision || 0, pages: Math.max(1, Math.ceil(count / 50)) });
  } catch (error) {
    return next(error);
  }
});

router.post('/episode-upsert', internalCatalogAuth, async (req, res, next) => {
  try {
    const provider = String(req.body?.provider || 'anilist').toLowerCase();
    const providerId = String(req.body?.providerId || '').trim();
    const episodeInputs = Array.isArray(req.body?.episodes)
      ? req.body.episodes.slice(0, 200)
      : [req.body?.episode];
    const providerKey = provider === 'anizip' ? 'aniZip' : provider;
    if (!['anilist', 'mal', 'kitsu', 'aniZip'].includes(providerKey) || !/^\d{1,128}$/.test(providerId) || !episodeInputs.some(Boolean)) {
      return res.status(400).json({ success: false, message: 'Provider, provider ID, and episode are required' });
    }
    const entry = await SeoCatalogEntry.findOne({ [`providerIds.${providerKey}`]: providerId });
    if (!entry) return res.status(404).json({ success: false, message: 'Catalog entry not found' });
    const normalizedEpisodes = normalizeAnime({ title: entry.titles, episodeList: episodeInputs })?.episodes || [];
    if (!normalizedEpisodes.length) return res.status(400).json({ success: false, message: 'Invalid episode metadata' });
    const result = await persistEntry({ ...publicEntry(entry), episodes: normalizedEpisodes });
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
});

router.get('/sitemap', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(1000, Number.parseInt(req.query.limit, 10) || 50));
    const entries = await SeoCatalogEntry.find(sitemapEligibilityQuery)
      .sort({ canonicalId: 1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
    const hasNextPage = entries.length > limit;
    if (hasNextPage) entries.pop();
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, page, limit, hasNextPage, entries: entries.map(publicEntry) });
  } catch (error) {
    return next(error);
  }
});

router.post('/upsert', internalCatalogAuth, async (req, res, next) => {
  try {
    const result = await persistEntry(req.body);
    return res.status(result.changed ? 201 : 200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
});

router.post('/invalidate', internalCatalogAuth, async (req, res, next) => {
  try {
    const query = req.body?.canonicalId ? { canonicalId: String(req.body.canonicalId) } : { slug: String(req.body?.slug || '') };
    if (!Object.values(query)[0]) return res.status(400).json({ success: false, message: 'A catalog identity is required' });
    const entry = await SeoCatalogEntry.findOneAndUpdate(query, { $set: { metadataState: 'stale' }, $inc: { revision: 1 } }, { new: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Catalog entry not found' });
    await bumpCatalogRevision();
    return res.json({ success: true, entry: publicEntry(entry) });
  } catch (error) {
    return next(error);
  }
});

export { persistEntry, publicEntry };
export default router;
