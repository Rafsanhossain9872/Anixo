import json, os, time, re
from dotenv import load_dotenv
from urllib.parse import quote as url_quote

# Load environment variables
load_dotenv()

# Vercel Compatibility: Use /tmp for writable files
IS_VERCEL = os.environ.get("VERCEL") == "1"
ANILIST_API_URL = "https://graphql.anilist.co"


import os
import re
import json
import logging
import hashlib
from functools import wraps

from flask import Flask, jsonify, request, Response
from datetime import datetime
from flask_cors import CORS
import requests
import cloudscraper


# ═══════════════════════════════════════════════════════════════════════════════
#  LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

class ColoredFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[94m",
        "INFO": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "CRITICAL": "\033[1;91m",
    }
    RESET = "\033[0m"

    def format(self, record):
        color = self.COLORS.get(record.levelname, "")
        record.msg = f"{color}{record.msg}{self.RESET}"
        return super().format(record)


log = logging.getLogger("tenzora")
log.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(ColoredFormatter("[%(asctime)s] %(levelname)s ⚡ %(message)s", datefmt="%H:%M:%S"))
log.addHandler(_handler)


# ═══════════════════════════════════════════════════════════════════════════════
#  HTTP CLIENT — Centralized, replaces all raw requests / AJAX patterns
# ═══════════════════════════════════════════════════════════════════════════════

class HttpClient:
    """
    Centralized HTTP client with auto-retry, timeout, and consistent headers.
    Replaces all scattered requests.get/post + AJAX header logic.
    """

    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }

    def __init__(self, retries=5, backoff=2, timeout=15):
        self.timeout = timeout
        self.session = cloudscraper.create_scraper(
            delay=10,
            browser={
                'custom': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        )
        self.session.headers.update(self.DEFAULT_HEADERS)
        log.info("HttpClient initialized with Stealth Mode headers")

    def get(self, url, params=None, headers=None, referer=None, timeout=None):
        """GET request with optional overrides."""
        h = {**self.session.headers, **(headers or {})}
        if referer:
            h["Referer"] = referer
        return self.session.get(url, params=params, headers=h, timeout=timeout or self.timeout)

    def post(self, url, data=None, json=None, headers=None, referer=None, timeout=None):
        """POST request with optional overrides."""
        h = {**self.session.headers, **(headers or {})}
        if referer:
            h["Referer"] = referer
        return self.session.post(url, data=data, json=json, headers=h, timeout=timeout or self.timeout)

    def get_json(self, url, params=None, **kwargs):
        """GET and auto-parse JSON response."""
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def get_html(self, url, params=None, **kwargs):
        """GET and return response text (HTML)."""
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.text


# Global client instance
http = HttpClient()


app = Flask(__name__)
# Prevent API theft by restricting CORS to allowed domains
allowed_domains = [
    "https://tenzora.top",
    "https://www.tenzora.top",
    "https://tenzora.buzz",
    "https://www.tenzora.buzz",
    "http://localhost:5173",   # Local Vite frontend
    "http://127.0.0.1:5173",   # Local Vite (IP)
    "http://localhost:3000",   # Local alternative frontend
    "http://127.0.0.1:3000",   # Local alternative (IP)
    "http://localhost:4173",   # Local Vite preview
    "http://localhost:7860",   # Local backend/scraper
    "http://localhost:7861",   # Local online server
    "http://localhost:8080",   # Local chat API
    "http://localhost:4000"    # Local comment server
]
CORS(app, resources={r"/*": {"origins": allowed_domains}})


# ═══════════════════════════════════════════════════════════════════════════════
#  CACHING CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

_cache = {}
TTL_SEARCH = 600      # 10 minutes
TTL_DETAILS = 1800    # 30 minutes
TTL_EPISODES = 3600   # 60 minutes
TTL_PROXY = 600       # 10 minutes (AniList)
TTL_TRENDING = 3600    # 1 hour (Trending/Popular)
TTL_FALLBACK = 300    # 5 minutes (Jikan)
TTL_STATIC = 86400    # 24 hours (Genres, etc.)

# Global Rate Limit Tracker
_anilist_status = {
    "remaining": 90,
    "reset": 0,
    "is_blocked": False
}


def cached(prefix, ttl=TTL_SEARCH):
    """Decorator for caching function results with TTL."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Standardize key: prefix:lowercase_args
            safe_args = [str(a).lower().strip() for a in args]
            key = f"{prefix}:{':'.join(safe_args)}"
            entry = _cache.get(key)
            if entry and (time.time() - entry["ts"]) < ttl:
                return entry["data"]
            result = fn(*args, **kwargs)
            if result: # Only cache truthy results
                _cache[key] = {"data": result, "ts": time.time()}
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER: Standard API response wrapper
# ═══════════════════════════════════════════════════════════════════════════════

def api_response(fn):
    """Decorator that wraps route handlers with consistent error handling and caching."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            if isinstance(result, tuple):
                data, code = result
                resp = jsonify({"success": True, **data}) if isinstance(data, dict) else jsonify(data)
                # Add browser caching for successful GET requests (1 hour)
                if request.method == "GET" and code == 200:
                    resp.headers["Cache-Control"] = "public, max-age=300"
                return resp, code
            
            resp = jsonify({"success": True, **result})
            if request.method == "GET":
                resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
        except requests.exceptions.RequestException as e:
            log.error("Network error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": f"Network error: {e}"}), 502
        except Exception as e:
            log.error("Error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": str(e)}), 500
    wrapper.__name__ = fn.__name__
    return wrapper





# ═══════════════════════════════════════════════════════════════════════════════
#  SEO: Dynamic Sitemap Generator
# ═══════════════════════════════════════════════════════════════════════════════

_sitemap_cache = {}
SITEMAP_TTL = 600  # Cache for 10 minutes

def _fetch_anime_for_sitemap():
    """Fetch popular + trending anime from AniList for sitemap. No scraping."""
    query = """
    query {
      trending: Page(page: 1, perPage: 50) {
        media(type: ANIME, sort: TRENDING_DESC) {
          id
          title { romaji english }
          updatedAt
        }
      }
      popular: Page(page: 1, perPage: 50) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          updatedAt
        }
      }
      topRated: Page(page: 1, perPage: 50) {
        media(type: ANIME, sort: SCORE_DESC) {
          id
          title { romaji english }
          updatedAt
        }
      }
    }
    """
    try:
        import requests as req
        resp = req.post(
            ANILIST_API_URL,
            json={"query": query},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=5
        )
        data = resp.json().get("data", {})
        
        # Deduplicate by ID
        seen = set()
        anime_list = []
        for category in ["trending", "popular", "topRated"]:
            for media in data.get(category, {}).get("media", []):
                if media["id"] not in seen:
                    seen.add(media["id"])
                    anime_list.append(media)
        
        return anime_list
    except Exception as e:
        log.error(f"Sitemap: Failed to fetch anime data: {e}")
        return []


def _generate_sitemap_xml(base):
    """Generate the complete sitemap XML string."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Static pages
    static_pages = [
        {"loc": f"{base}/", "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{base}/home", "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{base}/browse", "priority": "0.9", "changefreq": "daily"},
        {"loc": f"{base}/schedule", "priority": "0.8", "changefreq": "daily"},
        {"loc": f"{base}/dmca", "priority": "0.3", "changefreq": "yearly"},
        {"loc": f"{base}/terms", "priority": "0.3", "changefreq": "yearly"},
    ]
    
    # Fetch anime
    anime_list = _fetch_anime_for_sitemap()
    
    # Build XML
    urls = []
    
    # Static pages
    for page in static_pages:
        urls.append(f"""  <url>
    <loc>{page['loc']}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")
    
    # Anime detail pages: /watch/{anilist_id}
    for anime in anime_list:
        anime_id = anime["id"]
        urls.append(f"""  <url>
    <loc>{base}/watch/{anime_id}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>""")
    
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += '\n'.join(urls)
    xml += '\n</urlset>'
    
    return xml


@app.route("/sitemap.xml", methods=["GET"])
def serve_sitemap():
    """Serve dynamic sitemap with 10-minute cache."""
    now = time.time()
    host = request.host or "tenzora.top"
    # Clean host to prevent any weird headers
    host = re.sub(r'[^a-zA-Z0-9.:-]', '', host)
    
    cache_entry = _sitemap_cache.get(host)
    if cache_entry and (now - cache_entry["ts"]) < SITEMAP_TTL:
        log.info(f"Sitemap: ⚡ Serving from cache for host: {host}")
        xml = cache_entry["xml"]
    else:
        log.info(f"Sitemap: 🔄 Generating fresh sitemap for host: {host}...")
        scheme = request.headers.get("X-Forwarded-Proto", "https")
        base = f"{scheme}://{host}"
        base = base.rstrip('/')
        xml = _generate_sitemap_xml(base)
        _sitemap_cache[host] = {"xml": xml, "ts": now}
        log.info(f"Sitemap: ✅ Generated & cached for host: {host}")
    
    resp = Response(xml, mimetype="application/xml")
    resp.headers["Cache-Control"] = "public, max-age=600"
    return resp


@app.route("/robots.txt", methods=["GET"])
def serve_robots():
    """Serve dynamic robots.txt pointing to the correct sitemap URL based on current host."""
    host = request.host or "tenzora.top"
    host = re.sub(r'[^a-zA-Z0-9.:-]', '', host)
    scheme = request.headers.get("X-Forwarded-Proto", "https")
    base = f"{scheme}://{host}"
    base = base.rstrip('/')
    
    # Try reading the robots template file, or use a default template
    robots_txt_path = os.path.join(os.path.dirname(__file__), "..", "public", "robots_template.txt")
    
    content = ""
    if os.path.exists(robots_txt_path):
        try:
            with open(robots_txt_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            pass
            
    if not content:
        content = """# TenZora Robots.txt — Production SEO
User-agent: *
Allow: /

# Block private/auth pages from indexing
Disallow: /reset-password
Disallow: /forgot-password
Disallow: /profile
Disallow: /settings
Disallow: /watchlist
Disallow: /watching
Disallow: /notifications
Disallow: /import
Disallow: /api/

# Sitemap
Sitemap: https://tenzora.top/sitemap.xml
"""

    content = re.sub(
        r"Sitemap:\s*https?://[^\s/]+/sitemap.xml",
        f"Sitemap: {base}/sitemap.xml",
        content,
        flags=re.IGNORECASE
    )
    
    if "Sitemap:" not in content:
        content += f"\n\nSitemap: {base}/sitemap.xml\n"
        
    resp = Response(content, mimetype="text/plain")
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Core
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
@app.route("/api", methods=["GET"])
def index():
    return jsonify({
        "success": True,
        "api": "TenZora Unified API",
        "status": "online",
        "version": "3.1.1",
        "engines": ["jikan"],
        "endpoints": {
            "core": {
                "/api/anilist/proxy": "GraphQL Proxy with Jikan Fallback"
            },
            "metadata": {
                "/api/malsync/<mal_id>": "MALSync lookup",
                "/api/jikan/proxy?path=": "Direct Jikan REST proxy",
                "/api/check-dub/<id>": "Quick check for dub availability"
            }
        }
    })

















# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — MALSync
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/malsync/<mal_id>", methods=["GET"])
@api_response
def api_malsync(mal_id):
    data = http.get_json(f"https://api.malsync.moe/mal/anime/{mal_id}")
    return data


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — AniList Proxy (Bypass CORS)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/anilist/proxy", methods=["POST"])
@api_response
def api_anilist_proxy():
    payload = request.get_json()
    if not payload or "query" not in payload:
        return {"error": "Invalid payload"}, 400

    # 1. Hashing for Cache Key
    payload_str = json.dumps(payload, sort_keys=True)
    payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    cache_key = f"anilist:proxy:{payload_hash}"
    
    query_str = str(payload.get("query", "")).lower()
    variables = payload.get("variables", {})
    sort_vars = str(variables.get("sort", [])).lower()

    # 2. Check Cache
    entry = _cache.get(cache_key)
    stale_data = None
    if entry:
        stale_data = entry.get("data")
        is_fallback = entry.get("source") == "jikan"
        
        # Determine TTL: Trending/Popular queries get longer cache
        is_popular = "trending" in sort_vars or "popularity" in sort_vars or "score" in sort_vars
        ttl_to_use = TTL_TRENDING if is_popular and not is_fallback else (TTL_FALLBACK if is_fallback else TTL_PROXY)
        
        if (time.time() - entry["ts"]) < ttl_to_use:
            log.info(f"AniList Proxy: ⚡ Cache Hit ({entry.get('source', 'anilist')})")
            return entry["data"]
        else:
            log.info(f"AniList Proxy: ⌛ Cache Expired ({entry.get('source', 'anilist')})")
            # If we already know we are blocked, serve stale immediately
            if _anilist_status["is_blocked"] and stale_data:
                 log.info("AniList Proxy: 🛡️ Circuit Breaker - Serving stale cache")
                 return stale_data

    # 3. Basic abuse mitigation: Ensure query contains AniList keywords
    query_str = str(payload.get("query", "")).lower()
    allowed_keywords = ["page", "media", "staff", "character", "studio", "airing", "trend", "search", "genrecollection", "airingschedules"]
    if not any(k in query_str for k in allowed_keywords):
         return {"error": "Forbidden: Non-AniList query pattern detected"}, 403

    log.info(f"AniList Proxy: 🌐 Fetching (Rem: {_anilist_status['remaining']})...")
    
    import random  # We only need random here, requests is already imported at top
    
    # Pre-emptive check: If we know we are blocked, don't even try
    if _anilist_status["is_blocked"] and time.time() < _anilist_status["reset"]:
        log.warning(f"AniList Proxy: 🛡️ Circuit Breaker Active (Reset in {int(_anilist_status['reset'] - time.time())}s)")
        use_fallback = True
    else:
        uas = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
        ]
        try:
            resp = requests.post(
                ANILIST_API_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json", 
                    "Accept": "application/json", 
                    "User-Agent": random.choice(uas)
                },
                timeout=10
            )
            
            # Update Rate Limit Info from Headers
            rem = resp.headers.get("X-RateLimit-Remaining")
            if rem is not None:
                _anilist_status["remaining"] = int(rem)
            
            # 4. Handle Response
            if resp.status_code == 200:
                _anilist_status["is_blocked"] = False
                data = resp.json()
                if "errors" in data and any("disabled" in str(e.get("message", "")).lower() for e in data["errors"]):
                    log.warning("AniList Proxy: ⚠️ API reported as DISABLED. Triggering fallback...")
                    use_fallback = True
                else:
                    data["source"] = "anilist"
                    _cache[cache_key] = {"data": data, "ts": time.time(), "source": "anilist"}
                    return data, 200
            elif resp.status_code == 429:
                log.warning("AniList Proxy: ⚠️ Rate Limited (429). Triggering fallback...")
                _anilist_status["is_blocked"] = True
                # AniList reset is usually a Unix timestamp
                reset_at = resp.headers.get("X-RateLimit-Reset")
                _anilist_status["reset"] = int(reset_at) if reset_at else (time.time() + 60)
                use_fallback = True
            else:
                log.warning(f"AniList Proxy: ⚠️ Status {resp.status_code}. Triggering fallback...")
                use_fallback = True
                
        except (requests.Timeout, requests.RequestException) as e:
            log.warning(f"AniList Proxy: ⚠️ Connection Failure ({type(e).__name__}). Triggering fallback...")
            use_fallback = True

    # 5. Jikan Fallback Implementation
    if use_fallback:
        try:
            variables = payload.get("variables", {})
            query_str = str(payload.get("query", "")).lower()
            
            # Extract search term or ID
            search_term = variables.get("search")
            anime_id = variables.get("id") or variables.get("idMal")

            # If ID is a string (slug), use it as search term
            if anime_id and not str(anime_id).isdigit():
                search_term = str(anime_id).replace("-", " ")
                anime_id = None
            sort_vars = str(variables.get("sort", [])).lower()
            status_var = variables.get("status", "").upper()
            
            # Map AniList status to Jikan status
            jikan_status_map = {
                "RELEASING": "airing",
                "FINISHED": "complete",
                "NOT_YET_RELEASED": "upcoming"
            }
            j_status = jikan_status_map.get(status_var, "")
            
            # Dynamic URL Builder for Jikan
            base_url = "https://api.jikan.moe/v4/anime"
            page_num = variables.get("page", 1)
            params = [f"limit=24", f"page={page_num}"]
            
            if search_term:
                params.append(f"q={url_quote(search_term)}")
            
            if j_status:
                params.append(f"status={j_status}")
            
            # Handle sorting
            if "trending" in sort_vars:
                params.append("order_by=popularity&sort=desc")
            elif "score" in sort_vars:
                params.append("order_by=score&sort=desc")
            elif "popularity" in sort_vars:
                params.append("order_by=members&sort=desc")
            elif "start_date" in sort_vars:
                params.append("order_by=start_date&sort=desc")

            jikan_url = f"{base_url}?{'&'.join(params)}"
            
            # Special Overrides: Only if no specific filters (search/status) are active
            if not search_term and not j_status:
                if anime_id:
                    jikan_url = f"https://api.jikan.moe/v4/anime/{anime_id}"
                elif "season" in query_str or variables.get("season"):
                    # Popular This Season: Use current season popular by members
                    jikan_url = f"https://api.jikan.moe/v4/anime?status=airing&order_by=members&sort=desc&limit=24&page={page_num}"
                elif "genrecollection" in query_str:
                    jikan_url = "https://api.jikan.moe/v4/genres/anime"
                elif "trending" in sort_vars:
                     # Trending Now: Use Top Airing filter which focuses on current buzz/score
                     jikan_url = f"https://api.jikan.moe/v4/top/anime?filter=airing&limit=24&page={page_num}"
                elif "page(" in query_str or "page {" in query_str:
                    # Default Browse view: Finished + Popular
                    jikan_url = f"https://api.jikan.moe/v4/anime?status=complete&order_by=popularity&sort=desc&limit=24&page={page_num}"
                elif "media(" in query_str or "media {" in query_str:
                    # Try to extract ID from query string if variables are missing
                    id_match = re.search(r'id:\s*(\d+)', query_str)
                    if id_match:
                        jikan_url = f"https://api.jikan.moe/v4/anime/{id_match.group(1)}"
                    else:
                        jikan_url = f"https://api.jikan.moe/v4/top/anime?limit=1&page={page_num}"
                else:
                    # Last resort fallback to avoid 503
                    jikan_url = f"https://api.jikan.moe/v4/top/anime?limit=10&page={page_num}"

            log.info(f"AniList Fallback: 🔄 Fetching from Jikan: {jikan_url}")
            
            # Retry logic for Jikan Rate Limits (429)
            j_resp = None
            for attempt in range(3):
                try:
                    j_resp = requests.get(jikan_url, timeout=10)
                    if j_resp.status_code == 200:
                        break
                    if j_resp.status_code == 429:
                        log.warning(f"AniList Fallback: ⏳ Jikan Rate Limited (429). Retrying in {attempt + 1}s...")
                        time.sleep(attempt + 1)
                    else:
                        break
                except Exception as je:
                    log.warning(f"AniList Fallback: ⏳ Connection attempt {attempt+1} failed: {je}")
                    time.sleep(1)

            if not j_resp or j_resp.status_code != 200:
                log.error(f"AniList Fallback: ❌ Jikan failed with status {j_resp.status_code if j_resp else 'Unknown'}")
                if stale_data:
                    log.info("AniList Fallback: 🔄 Both failed, but found STALE cache. Using it.")
                    return stale_data, 200
                return {"error": "Both AniList and Fallback failed", "source": "error", "jikan_status": j_resp.status_code if j_resp else None}, 503
            
            j_data = j_resp.json()
            if not isinstance(j_data, dict):
                log.error(f"AniList Fallback: Jikan returned unexpected type: {type(j_data)}")
                return {"error": "Invalid fallback response format"}, 500
            
            j_content = j_data.get("data")
            
            if not j_content:
                log.warning(f"AniList Fallback: ⚠️ Jikan 'data' key is empty or missing. Raw: {str(j_data)[:200]}")

            # 6. Normalize Response to AniList Structure
            # Required fields: id, title, image, episodes, source
            def normalize_item(item):
                if not isinstance(item, dict):
                    return None
                
                # Extract dates safely
                aired = item.get("aired", {}) or {}
                prop = aired.get("prop", {}) or {}
                from_date = prop.get("from", {}) or {}
                to_date = prop.get("to", {}) or {}
                
                cover_large = item.get("images", {}).get("webp", {}).get("large_image_url") or item.get("images", {}).get("jpg", {}).get("large_image_url")
                
                return {
                    "id": item.get("mal_id"),
                    "idMal": item.get("mal_id"),
                    "type": "ANIME",
                    "title": {
                        "romaji": item.get("title"),
                        "english": item.get("title_english") or item.get("title"),
                        "native": item.get("title_japanese")
                    },
                    "coverImage": {
                        "extraLarge": cover_large,
                        "large": cover_large,
                        "medium": item.get("images", {}).get("webp", {}).get("small_image_url")
                    },
                    "bannerImage": cover_large, # Fallback
                    "episodes": item.get("episodes"),
                    "status": "FINISHED" if item.get("status") == "Finished Airing" else "RELEASING",
                    "broadcast": item.get("broadcast", {}).get("string") if isinstance(item.get("broadcast"), dict) else None,
                    "averageScore": int(item.get("score") * 10) if item.get("score") else None,
                    "description": item.get("synopsis"),
                    "format": (item.get("type") or "TV").upper(),
                    "genres": [g.get("name") for g in item.get("genres", []) if isinstance(g, dict) and g.get("name")],
                    "startDate": {
                        "year": from_date.get("year"),
                        "month": from_date.get("month"),
                        "day": from_date.get("day")
                    },
                    "endDate": {
                        "year": to_date.get("year"),
                        "month": to_date.get("month"),
                        "day": to_date.get("day")
                    },
                    "relations": {"edges": []},
                    "recommendations": {"nodes": []},
                    "source": "jikan"
                }

            normalized_data = {"data": {}}
            j_content = j_data.get("data")
            
            if "genrecollection" in query_str:
                # Normalize Jikan genres (list of dicts) to AniList genres (list of strings)
                genres = [g.get("name") for g in j_content if isinstance(g, dict) and g.get("name")]
                normalized_data["data"]["GenreCollection"] = genres
            elif "page(" in query_str or "page {" in query_str:
                # List/Search structure
                items = j_content if isinstance(j_content, list) else [j_content]
                
                # Extract real pagination from Jikan
                j_pagination = j_data.get("pagination", {})
                last_page = j_pagination.get("last_visible_page", 1)
                has_next = j_pagination.get("has_next_page", False)
                total_items = j_pagination.get("items", {}).get("total", len(items))
                current_p = j_pagination.get("current_page", 1)

                # Deduplicate media by ID
                seen_ids = set()
                unique_media = []
                for m in [normalize_item(i) for i in items if i]:
                    if m["id"] not in seen_ids:
                        seen_ids.add(m["id"])
                        unique_media.append(m)

                normalized_data["data"]["Page"] = {
                    "media": unique_media,
                    "pageInfo": {
                        "total": total_items, 
                        "currentPage": current_p,
                        "lastPage": last_page,
                        "hasNextPage": has_next,
                        "perPage": len(items)
                    }
                }
            else:
                # Detail structure
                item = j_content if isinstance(j_content, dict) else (j_content[0] if isinstance(j_content, list) and j_content else {})
                normalized_data["data"]["Media"] = normalize_item(item)

            if "Media" in normalized_data["data"]:
                normalized_data["Media"] = normalized_data["data"]["Media"]
            normalized_data["source"] = "jikan"
            # Cache fallback results ONLY if AniList is not already in cache or is expired
            _cache[cache_key] = {"data": normalized_data, "ts": time.time(), "source": "jikan"}
            return normalized_data, 200

        except Exception as e:
            log.exception("AniList Fallback: Critical failure")
            return {"error": "Fallback processing error", "details": str(e)}, 500

    return {"error": "Unexpected proxy state"}, 500


@app.route("/api/check-dub/<id>", methods=["GET"])
@api_response
def api_check_dub(id):
    """
    Checks if an anime has a dub available.
    Currently uses a simple heuristic or checks the recent dubs list.
    """
    # For now, return a neutral response to stop 404s.
    # In a real scenario, you could check a database or external API.
    return {"id": id, "hasDub": False}, 200


@app.route("/api/jikan/proxy", methods=["GET"])
@api_response
def api_jikan_proxy():
    """
    Dedicated Jikan Proxy to avoid direct frontend -> Jikan calls.
    Used for episode titles, characters, and other REST data.
    """
    path = request.args.get("path", "")
    if not path:
        return {"error": "Missing Jikan path"}, 400
    
    # Security: Ensure path starts with /v4/
    if not path.startswith("/v4/"):
        path = "/v4/" + path.lstrip("/")

    # Prevent path traversal and SSRF via URL-encoded characters
    if ".." in path or "%" in path:
        return {"error": "Invalid Jikan path"}, 400
    from urllib.parse import urlparse
    full_url = f"https://api.jikan.moe{path}"
    parsed = urlparse(full_url)
    if parsed.scheme != "https" or parsed.netloc != "api.jikan.moe":
        return {"error": "Invalid Jikan path"}, 400
    
    # Preserve other query params
    params = request.args.to_dict()
    params.pop("path", None)
    
    log.info(f"Jikan Proxy: 🌐 Fetching {full_url}")
    
    # Reuse retry logic
    j_resp = None
    for attempt in range(3):
        try:
            j_resp = requests.get(full_url, params=params, timeout=10, allow_redirects=False)
            if j_resp.status_code == 200:
                break
            if j_resp.status_code == 429:
                time.sleep(attempt + 1)
            else:
                break
        except:
            time.sleep(0.5)

    if not j_resp or j_resp.status_code != 200:
        return {"error": f"Jikan failed with status {j_resp.status_code if j_resp else 'timeout'}"}, 502
    
    return j_resp.json()

# ═══════════════════════════════════════════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/afl/fillers", methods=["GET"])
@api_response
def get_afl_fillers():
    title = request.args.get("title")
    if not title:
        return {"error": "Missing title"}, 400
        
    cache_key = f"afl_fillers:{title.lower().strip()}"
    entry = _cache.get(cache_key)
    if entry and (time.time() - entry["ts"]) < 86400:
        return entry["data"]
    
    from bs4 import BeautifulSoup
    import urllib.parse
    import re

    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    target_url = f"https://www.animefillerlist.com/shows/{slug}"
    
    show_res = http.get(target_url, timeout=10)
    
    # If not found directly, fallback to search
    if show_res.status_code == 404:
        search_url = f"https://www.animefillerlist.com/search/node/{urllib.parse.quote(title)}"
        search_res = http.get(search_url, timeout=10)
        
        soup = BeautifulSoup(search_res.text, 'html.parser')
        target_url = None
        for a in soup.select('.search-result .title a'):
            href = a.get('href', '')
            if href.startswith('https://www.animefillerlist.com/shows/') and len(href.split('/')) == 5:
                target_url = href
                break
                
        if target_url:
            show_res = http.get(target_url, timeout=10)

    if show_res.status_code != 200:
        _cache[cache_key] = {"data": {}, "ts": time.time()}
        return {}
        
    soup = BeautifulSoup(show_res.text, 'html.parser')
    fillers = {}
    
    for tr in soup.select('table.EpisodeList tr'):
        num_el = tr.select_one('.Number')
        if not num_el:
            continue
            
        try:
            ep_num = int(num_el.text.strip())
        except ValueError:
            continue
            
        classes = tr.get('class', [])
        is_filler = 'filler' in classes
        is_mixed = 'mixed_canon/filler' in classes
        is_recap = 'recap' in classes
        
        if is_filler or is_mixed or is_recap:
            fillers[str(ep_num)] = {
                "isFiller": is_filler,
                "isMixed": is_mixed,
                "isRecap": is_recap
            }
            
    _cache[cache_key] = {"data": fillers, "ts": time.time()}
    return fillers

# ═══════════════════════════════════════════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    log.info(f"Tenzora API starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)

