import json, os, time, re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Vercel Compatibility: Use /tmp for writable files
IS_VERCEL = os.environ.get("VERCEL") == "1"
STREAM_CACHE_FILE = "/tmp/stream_cache.json" if IS_VERCEL else "stream_cache.json"

CACHE_TTL = 600
MAX_CACHE_ENTRIES = 200
ANILIST_API_URL = "https://graphql.anilist.co"

def load_cache():
    if not os.path.exists(STREAM_CACHE_FILE):
        return {}
    try:
        with open(STREAM_CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Cache load error: {e}")
        return {}

def save_cache(cache):
    with open(STREAM_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def clean_cache(cache):
    now = time.time()

    # remove expired entries
    cache = {
        k: v for k, v in cache.items()
        if now - v.get("ts", 0) < CACHE_TTL
    }

    # limit size
    if len(cache) > MAX_CACHE_ENTRIES:
        sorted_items = sorted(cache.items(), key=lambda x: x[1]["ts"])
        remove_count = len(cache) - MAX_CACHE_ENTRIES
        for k, _ in sorted_items[:remove_count]:
            del cache[k]

    return cache


import os
import re
import json
import logging
import difflib
import hashlib
from functools import wraps

from flask import Flask, jsonify, request, Response
from datetime import datetime
from flask_cors import CORS
from bs4 import BeautifulSoup
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


log = logging.getLogger("anixo")
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

    def get_soup(self, url, params=None, **kwargs):
        """GET and return parsed BeautifulSoup."""
        html = self.get_html(url, params=params, **kwargs)
        return BeautifulSoup(html, "html.parser")


# Global client instance
http = HttpClient()

ANIKAI_BASE = "https://anikai.to"
ANIKAI_AJAX = f"{ANIKAI_BASE}/ajax"
ANIKAI_HEADERS = {**HttpClient.DEFAULT_HEADERS, "Referer": ANIKAI_BASE + "/"}
ANIKAI_AJAX_HEADERS = {**ANIKAI_HEADERS, "X-Requested-With": "XMLHttpRequest"}

app = Flask(__name__)
CORS(app)


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
#  ANIKAI SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class AnikaiScraper:
    """Anikai scraper with encryption/decryption pipeline."""

    BASE = ANIKAI_BASE
    AJAX = ANIKAI_AJAX
    ENC_DEC = "https://enc-dec.app/api"
    TIMEOUT_EXTERNAL = 8  # Reduced timeout for external decryption bridge

    def _encrypt(self, text):
        try:
            url = f"{self.ENC_DEC}/enc-kai"
            log.info("Anikai: Encrypting via %s...", url)
            data = http.get_json(url, params={"text": text}, timeout=self.TIMEOUT_EXTERNAL)
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Encryption failed (check network/ISP): %s", e)
            return None

    def _decrypt_kai(self, text):
        try:
            url = f"{self.ENC_DEC}/dec-kai"
            log.info("Anikai: Decrypting-K via %s...", url)
            resp = http.post(url, json={"text": text}, timeout=self.TIMEOUT_EXTERNAL)
            data = resp.json()
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Decryption-K failed: %s", e)
            return None

    def _decrypt_mega(self, text):
        try:
            url = f"{self.ENC_DEC}/dec-mega"
            log.info("Anikai: Decrypting-M via %s...", url)
            resp = http.post(url, json={
                "text": text,
                "agent": HttpClient.DEFAULT_HEADERS["User-Agent"],
            }, timeout=self.TIMEOUT_EXTERNAL)
            data = resp.json()
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Decryption-M failed: %s", e)
            return None

    @cached("static:genres", ttl=TTL_STATIC) # Cache for 24 hours
    def get_genres(self):
        try:
            log.info("Anikai: Fetching genres list...")
            resp = http.get(self.BASE, timeout=self.TIMEOUT_EXTERNAL)
            soup = BeautifulSoup(resp.text, "html.parser")
            genres = set()
            for a in soup.find_all("a", href=True):
                if "/genres/" in a["href"]:
                    genres.add(a.get_text(strip=True))
            return sorted(list(genres))
        except Exception as e:
            log.error("Anikai: Failed to fetch genres: %s", e)
            return []

    def resolve_to_anilist(self, slug):
        """Resolve an Anikai slug to an AniList ID."""
        info = self.get_info(slug)
        title = info.get("title") if info else None
        
        # If get_info failed (e.g. Anikai redirected to browser page) or returned raw slug
        if not title or title == slug:
            parts = slug.split('-')
            # Anikai slugs end with a short alphanumeric hash like "-6e9kv"
            if len(parts) > 1 and len(parts[-1]) <= 6 and parts[-1].isalnum():
                title = ' '.join(parts[:-1])
            else:
                title = ' '.join(parts)
            
        log.info(f"Resolving Anikai slug '{slug}' (Derived Title: {title}) to AniList...")
        
        # Clean title (remove (Dub), (2025), etc.)
        clean_title = re.sub(r'\(Dub\)|\(\d{4}\)', '', title).strip()
        
        # Search AniList
        search_query = """
        query ($search: String) {
          Page(page: 1, perPage: 5) {
            media(search: $search, type: ANIME) {
              id
              title { romaji english native }
            }
          }
        }
        """
        try:
            resp = http.post(
                ANILIST_API_URL,
                json={"query": search_query, "variables": {"search": clean_title}},
                headers={"Content-Type": "application/json"}
            )
            data = resp.json()
            results = data.get("data", {}).get("Page", {}).get("media", [])
            
            if not results:
                return None
                
            # Best match logic
            best_match = results[0] # Default to first result
            
            titles = []
            for r in results:
                titles.extend([
                    r["title"].get("romaji", ""),
                    r["title"].get("english", ""),
                    r["title"].get("native", "")
                ])
            titles = [t for t in titles if t]
            
            matches = difflib.get_close_matches(clean_title, titles, n=1, cutoff=0.6)
            if matches:
                matched_title = matches[0]
                for r in results:
                    if matched_title in [r["title"].get("romaji"), r["title"].get("english"), r["title"].get("native")]:
                        best_match = r
                        break
            
            log.info(f"Resolved Anikai '{slug}' -> AniList ID: {best_match['id']}")
            return {"anilist_id": best_match["id"], "title": best_match["title"]}
            
        except Exception as e:
            log.error(f"Anikai resolution failed: {e}")
            return None

    @cached("search:anikai:browse", ttl=TTL_SEARCH)
    def browse_genre(self, genre_id, page=1, sort="updated_date", formats=None, status=None, year=None, season=None, country=None, language=None):
        try:
            log.info(f"Anikai: Browsing genre ID {genre_id} (Page {page}, Sort {sort}, Formats {formats}, Status {status}, Year {year}, Season {season}, Country {country}, Language {language})")
            url = f"{self.BASE}/browser"
            params = {"genre[]": genre_id, "page": page, "sort": sort}
            
            # Anikai uses type[] for formats
            if formats:
                # Flask request.args.getlist or comma separated
                if isinstance(formats, str):
                    formats = [f.strip() for f in formats.split(',')]
                # Anikai format types are lowercase: tv, movie, ova, ona, special, music
                params["type[]"] = [f.lower() for f in formats]
                
            if status:
                status_map = {"RELEASING": "releasing", "FINISHED": "completed", "NOT_YET_RELEASED": "info"}
                if status in status_map:
                    params["status[]"] = status_map[status]
                    
            if year:
                params["year[]"] = str(year)
                
            if season:
                params["season[]"] = season.lower()
                
            if country:
                country_map = {"JP": "11", "CN": "2"}
                if country in country_map:
                    params["country[]"] = country_map[country]
                    
            if language:
                if isinstance(language, str):
                    language = [l.strip() for l in language.split(',')]
                params["language[]"] = [l.lower() for l in language]

            resp = http.get(url, params=params, timeout=self.TIMEOUT_EXTERNAL)
            soup = BeautifulSoup(resp.text, "html.parser")
            
            results = []
            for item in soup.select('div.inner'):
                poster_elem = item.select_one('a.poster img')
                title_elem = item.select_one('a.title')
                link_elem = item.select_one('a.poster')
                
                if not title_elem or not link_elem:
                    continue
                    
                title = title_elem.get('title') or title_elem.get_text(strip=True)
                slug_href = link_elem.get('href', '')
                slug = slug_href.replace('/watch/', '').strip() if slug_href else None
                poster = poster_elem.get('data-src') or poster_elem.get('src') if poster_elem else None
                
                if slug and title:
                    # Extract episode count and format type
                    episodes = None
                    fmt = "TV"
                    has_dub = False
                    info_div = item.select_one('div.info')
                    if info_div:
                        sub_span = info_div.select_one('span.sub') or info_div.select_one('span.ep')
                        dub_span = info_div.select_one('span.dub')
                        
                        if dub_span:
                            has_dub = True
                            
                        # Use dub count if available, else sub count
                        target_span = dub_span or sub_span
                        if target_span:
                            ep_txt = target_span.get_text(strip=True)
                            if ep_txt.isdigit():
                                episodes = int(ep_txt)
                        
                        b_tags = info_div.select('b')
                        if b_tags:
                            # The last 'b' tag usually contains the format like 'TV' or 'ONA'
                            # Sometimes an earlier 'b' tag contains the total episodes (e.g., '26')
                            last_b_text = b_tags[-1].get_text(strip=True)
                            if not last_b_text.isdigit():
                                fmt = last_b_text

                    results.append({
                        "id": slug,
                        "title": {"english": title, "romaji": title, "native": title},
                        "coverImage": {"large": poster, "medium": poster},
                        "episodes": episodes,
                        "format": fmt,
                        "dub": has_dub,
                        "isMAL": False,
                        "isAnikai": True
                    })
                    
            has_next = bool(soup.select('.pagination a[title="Next"]'))
            return {"media": results, "pageInfo": {"hasNextPage": has_next, "currentPage": page}}
        except Exception as e:
            log.error(f"Anikai: Browse failed: {e}")
            return {"media": [], "pageInfo": {"hasNextPage": False}}

    @cached("search:anikai", ttl=TTL_SEARCH)
    def search(self, query):
        try:
            # Using the /browser URL format as suggested by user
            html = http.get_html(f"{self.BASE}/browser", params={"keyword": query})
            soup = BeautifulSoup(html, "html.parser")
            results = []
            
            # Anikai /browser results are inside .aitem or .inner containers
            items = soup.select(".aitem") or soup.select(".inner")
            
            for item in items:
                title_tag = item.select_one(".title") or item.select_one("a.title")
                if not title_tag:
                    continue
                    
                title = title_tag.get_text(strip=True)
                
                # Extract slug from poster link or title link
                link_tag = item.select_one(".poster") or item.select_one("a.title")
                if not link_tag:
                    continue
                    
                href = link_tag.get("href", "")
                slug = href.replace("/watch/", "").strip("/") if "/watch/" in href else href.strip("/")

                # Extract poster
                poster_img = item.select_one(".poster img") or item.select_one("img")
                poster = ""
                if poster_img:
                    poster = poster_img.get("data-src") or poster_img.get("src") or ""

                if title and slug:
                    results.append({
                        "title": title, 
                        "slug": slug, 
                        "poster": poster, 
                        "source": "anikai"
                    })
            return results
        except Exception as e:
            log.error(f"Anikai Search failed: {e}")
            return []

    @cached("details:anikai", ttl=TTL_DETAILS)
    def get_info(self, slug):
        try:
            html = http.get_html(f"{self.BASE}/watch/{slug}")
        except Exception:
            return None

        soup = BeautifulSoup(html, "html.parser")
        ani_id = ""

        sync = soup.select_one("script#syncData")
        if sync:
            try:
                data = json.loads(sync.string) if sync.string else {}
                ani_id = data.get("anime_id", "")
            except Exception:
                pass

        if not ani_id:
            match = re.search(r'"anime_id"\s*:\s*"([^"]+)"', html)
            if match:
                ani_id = match.group(1)

        title = soup.select_one("h1.title")
        
        desc_div = soup.select_one(".film-description .text") or soup.select_one(".description")
        description = desc_div.get_text(separator='<br/>').strip() if desc_div else ""

        info = {
            "ani_id": ani_id,
            "title": title.get_text(strip=True) if title else slug,
            "slug": slug,
            "description": description,
        }


        label_map = {
            "Country:": "country",
            "Premiered:": "premiered",
            "Date aired:": "aired",
            "Broadcast:": "broadcast",
            "Episodes:": "episodes",
            "Duration:": "duration",
            "Status:": "status",
            "MAL Score:": "mal_score",
            "Studios:": "studios",
            "Producers:": "producers",
            "Genres:": "genres",
            "Rating:": "rating"
        }

        items = soup.select(".anisc-info .item")
        for item in items:
            head = item.select_one(".item-head")
            if not head:
                continue
            label = head.get_text(strip=True)
            name_tag = item.select_one(".name")
            if name_tag:
                names = [a.get_text(strip=True) for a in item.select("a.name")]
                if not names:
                    names = [name_tag.get_text(strip=True)]
                if label == "Genres:":
                    info["genres"] = names
                else:
                    value = ", ".join(names)
                    if label in label_map:
                        info[label_map[label]] = value
            else:
                value = item.get_text(strip=True).replace(label, "").strip()
                if label in label_map:
                    info[label_map[label]] = value

        # Extract Seasons - More Robust Logic
        seasons = []
        # Find the section that contains "Seasons" text
        seasons_title = soup.find(["h2", "h3", "div"], string=re.compile(r"Seasons", re.I))
        seasons_section = None
        
        if seasons_title:
            # The seasons list is usually the next sibling or a parent's child
            seasons_section = seasons_title.find_next("div", class_=re.compile(r"list|block|items")) or seasons_title.parent
        
        # Fallback to known selectors
        if not seasons_section or not seasons_section.select("a"):
            seasons_section = soup.select_one(".os-list") or soup.select_one(".ss-list") or soup.select_one(".seasons-block") or soup.select_one("#seasons")

        if seasons_section:
            for item in seasons_section.select("a"):
                if "/watch/" not in item.get("href", ""): continue
                
                s_title = item.get_text(strip=True)
                # Clean title if it contains episode count
                s_title = re.sub(r'\d+\s*EPS.*', '', s_title).strip()
                
                s_href = item.get("href", "")
                s_slug = s_href.replace("/watch/", "").strip("/")
                
                # Check for episode count badge
                ep_badge = item.select_one(".ep-status, .tick-item, .tick-eps, .episode-count")
                s_episodes = ep_badge.get_text(strip=True) if ep_badge else ""
                
                # Extract poster
                s_poster_img = item.select_one("img")
                s_poster = ""
                if s_poster_img:
                    s_poster = s_poster_img.get("data-src") or s_poster_img.get("src") or ""
                
                if s_title and s_slug:
                    # Very Strict Filter: Must contain a core part of the main title
                    main_title = info["title"].lower()
                    # Remove "Re:" prefix for better matching if needed, or just use core words
                    core_name = re.sub(r'season.*|part.*|s\d+.*', '', main_title).strip()
                    
                    # Split core name into meaningful words (length > 2)
                    core_keywords = [w for w in re.findall(r'\w+', core_name) if len(w) > 2]
                    
                    is_relevant = any(word in s_title.lower() for word in core_keywords)
                    
                    if is_relevant:
                        seasons.append({
                            "title": s_title,
                            "slug": s_slug,
                            "episodes": s_episodes,
                            "poster": s_poster,
                            "isActive": s_slug == slug or s_slug in slug or slug in s_slug
                        })
        
        info["seasons"] = seasons
        return info

    @cached("episodes:anikai", ttl=TTL_EPISODES)
    def get_episodes(self, ani_id):
        token = self._encrypt(ani_id)
        if not token:
            return []

        try:
            data = http.get_json(
                f"{self.AJAX}/episodes/list",
                params={"ani_id": ani_id, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return []

        html = data.get("result", "") if data else ""
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        return [{
            "number": int(ep.get("num") or 0) if ep.get("num") is not None else 0,
            "id": ep.get("token", ""),
            "title": ep.select_one("span").get_text(strip=True) if ep.select_one("span") is not None else f"Episode {ep.get('num', 0)}",
        } for ep in soup.select(".eplist a")]

    def get_links(self, ep_token):
        token = self._encrypt(ep_token)
        if not token:
            return []

        try:
            data = http.get_json(
                f"{self.AJAX}/links/list",
                params={"token": ep_token, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return []

        html = data.get("result", "") if data else ""
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        servers = []
        groups = soup.select(".server-items")
        
        if groups:
            for group in groups:
                # Extract lang from data-id (e.g. "sub", "dub", "softsub")
                group_lang = (group.get("data-id") or "sub").lower()
                for item in group.select(".server"):
                    servers.append({
                        "name": item.get_text(strip=True),
                        "link_id": item.get("data-lid", ""),
                        "lang": group_lang
                    })
        else:
            # Fallback for old structure or missing groups
            for item in soup.select(".server"):
                servers.append({
                    "name": item.get_text(strip=True),
                    "link_id": item.get("data-lid", ""),
                    "lang": "sub"
                })
                
        return servers

    def resolve_source(self, link_id):
        cache = load_cache()

        if link_id in cache:
            entry = cache[link_id]
            if time.time() - entry["ts"] < CACHE_TTL:
                return entry["data"]

        token = self._encrypt(link_id)
        if not token:
            return None

        try:
            data = http.get_json(
                f"{self.AJAX}/links/view",
                params={"id": link_id, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return None

        encrypted_result = data.get("result", "") if data else ""
        if not encrypted_result:
            return None

        embed_data = self._decrypt_kai(encrypted_result)
        if not embed_data or not embed_data.get("url"):
            return None

        embed_url = embed_data["url"]

        try:
            video_id = embed_url.rstrip("/").split("/")[-1].split("?")[0]
            embed_base = (embed_url.rsplit("/e/", 1)[0] if "/e/" in embed_url
                          else embed_url.replace("/embed-1/", "/").rsplit("/", 1)[0]).rstrip("/")

            # Fix: Add Referer header to bypass potential blocks on media endpoint
            headers = {
                "Referer": embed_url, 
                "User-Agent": HttpClient.DEFAULT_HEADERS["User-Agent"],
                "X-Requested-With": "XMLHttpRequest"
            }
            media_data = http.get_json(f"{embed_base}/media/{video_id}", headers=headers)
            encrypted_media = media_data.get("result", "") if media_data else ""

            final = self._decrypt_mega(encrypted_media)
            if final:
                result = {
                    "iframe_url": embed_url,
                    "sources": final.get("sources", []),
                    "subtitles": final.get("tracks", []),
                }

                cache[link_id] = {
                    "data": result,
                    "ts": time.time()
                }

                cache = clean_cache(cache)
                save_cache(cache)

                return result
        except Exception as e:
            log.error("Anikai resolution error: %s", e)

        return {"iframe_url": embed_url}


# ═══════════════════════════════════════════════════════════════════════════════
#  ANIKAI ADDITIONS
# ═══════════════════════════════════════════════════════════════════════════════

    @cached("search:anikai:recent", ttl=TTL_SEARCH)
    def get_recent_episodes(self, type="dub", limit=24, page=1):
        """Fetch recently updated episodes from Anikai."""
        results = []
        try:
            # Use /recent for the latest updates
            url = f"{self.BASE}/recent"
            params = {"page": page}
            html = http.get_html(url, params=params)
            soup = BeautifulSoup(html, "html.parser")
            
            # Extract pagination
            last_page = 1
            pagination = soup.select_one(".pagination")
            if pagination:
                pages = pagination.select("li.page-item a.page-link")
                for p in pages:
                    href = p.get("href", "")
                    if "page=" in href:
                        try:
                            p_num = int(href.split("page=")[-1].split("&")[0])
                            if p_num > last_page:
                                last_page = p_num
                        except:
                            continue

            items = soup.select(".aitem")
            for item in items:
                # Check for dub badge
                has_dub = item.select_one(".info .dub")
                if type == "dub" and not has_dub:
                    continue
                
                title_tag = item.select_one(".title")
                poster_img = item.select_one(".poster img")
                href_tag = item.select_one(".poster")
                
                if not title_tag or not href_tag:
                    continue
                
                title = title_tag.get_text(strip=True)
                slug = href_tag.get("href", "").replace("/watch/", "").lstrip("/")
                
                results.append({
                    "id": slug,
                    "title": {
                        "romaji": title,
                        "english": title
                    },
                    "coverImage": {
                        "large": poster_img.get("data-src") or poster_img.get("src") if poster_img else "",
                        "extraLarge": poster_img.get("data-src") or poster_img.get("src") if poster_img else ""
                    },
                    "episodes": has_dub.get_text(strip=True) if has_dub else "?",
                    "dub": True if type == "dub" else bool(has_dub),
                    "format": "TV",
                    "status": "RELEASING"
                })
            
            return {"results": results[:limit], "pageInfo": {"lastPage": last_page, "currentPage": page, "hasNextPage": page < last_page}}
        except Exception as e:
            log.error("Anikai: Recent fetch failed: %s", e)
            return {"results": [], "pageInfo": {"lastPage": 1, "currentPage": page, "hasNextPage": False}}




# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANTIATE SCRAPERS
# ═══════════════════════════════════════════════════════════════════════════════

anikai = AnikaiScraper()


# ═══════════════════════════════════════════════════════════════════════════════
#  SEO: Dynamic Sitemap Generator
# ═══════════════════════════════════════════════════════════════════════════════

_sitemap_cache = {"xml": None, "ts": 0}
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


def _generate_sitemap_xml():
    """Generate the complete sitemap XML string."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    base = "https://anixo.online"
    
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
    
    if _sitemap_cache["xml"] and (now - _sitemap_cache["ts"]) < SITEMAP_TTL:
        log.info("Sitemap: ⚡ Serving from cache")
        xml = _sitemap_cache["xml"]
    else:
        log.info("Sitemap: 🔄 Generating fresh sitemap...")
        xml = _generate_sitemap_xml()
        _sitemap_cache["xml"] = xml
        _sitemap_cache["ts"] = now
        log.info("Sitemap: ✅ Generated & cached")
    
    resp = Response(xml, mimetype="application/xml")
    resp.headers["Cache-Control"] = "public, max-age=600"
    return resp


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Core
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
@app.route("/api", methods=["GET"])
def index():
    return jsonify({
        "success": True,
        "api": "AniXo Unified API",
        "status": "online",
        "version": "3.1.0",
        "engines": ["anikai", "jikan"],
        "endpoints": {
            "core": {
                "/api/python/resolve/<slug>": "Resolve slug to AniList ID",
                "/api/python/recent-dub": "Get recently updated dubbed episodes",
                "/api/anilist/proxy": "GraphQL Proxy with Jikan Fallback"
            },
            "anikai": {
                "/api/anikai/search?keyword=": "Search Anikai",
                "/api/anikai/info/<slug>": "Get anime details",
                "/api/anikai/episodes/<ani_id>": "List episodes",
                "/api/anikai/stream/<ep_token>": "Get stream links",
                "/api/anikai/genres": "List all genres",
                "/api/anikai/browse/<genre_id>": "Browse by genre"
            },
            "metadata": {
                "/api/malsync/<mal_id>": "MALSync lookup",

                "/api/jikan/proxy?path=": "Direct Jikan REST proxy",
                "/api/check-dub/<id>": "Quick check for dub availability"
            },
            "community": {
                "/api/comments": "Get/Post comments",
                "/api/comments/vote": "Like/Dislike comments",
                "/api/comments/edit": "Update existing comments",
                "/api/comments/delete": "Soft-delete comments"
            }
        }
    })






# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Anikai
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/anikai/genres", methods=["GET"])
@api_response
def api_anikai_genres():
    return {"genres": anikai.get_genres()}

@app.route('/api/anikai/browse/<genre_id>', methods=['GET'])
@api_response
def api_anikai_browse(genre_id):
    page = request.args.get('page', 1, type=int)
    sort = request.args.get('sort', 'updated_date')
    formats = request.args.getlist('formats[]') or request.args.get('formats')
    status = request.args.get('status')
    year = request.args.get('year')
    season = request.args.get('season')
    country = request.args.get('country')
    language = request.args.getlist('language[]') or request.args.get('language')
    return anikai.browse_genre(genre_id, page, sort, formats, status, year, season, country, language)


@app.route("/api/anikai/search", methods=["GET"])
@api_response
def api_anikai_search():
    query = request.args.get("keyword", "").strip()
    if not query:
        return {"error": "keyword is required"}, 400
    return {"results": anikai.search(query)}


@app.route("/api/anikai/info/<slug>", methods=["GET"])
@api_response
def api_anikai_info(slug):
    result = anikai.get_info(slug)
    if not result:
        return {"error": "Anime not found"}, 404
    return result


@app.route("/api/anikai/episodes/<ani_id>", methods=["GET"])
@api_response
def api_anikai_episodes(ani_id):
    eps = anikai.get_episodes(ani_id)
    return {"ani_id": ani_id, "count": len(eps), "episodes": eps}


@app.route("/api/anikai/servers/<ep_token>", methods=["GET"])
@api_response
def api_anikai_servers(ep_token):
    servers = anikai.get_links(ep_token)
    if not servers:
        return {"error": "No servers found"}, 404
    return {"servers": servers}


@app.route("/api/anikai/stream/<ep_token>", methods=["GET"])
@api_response
def api_anikai_stream(ep_token):
    lang = request.args.get("lang", "sub").lower()
    server_id = request.args.get("server_id")  # Allow requesting a specific server
    # Support strict matching (no fallback to other languages)
    strict = request.args.get("strict", "false").lower() == "true"

    servers = anikai.get_links(ep_token)
    if not servers:
        return {"error": "No servers found for this episode"}, 404

    # If a specific server is requested, find it
    if server_id:
        target_server = next((s for s in servers if s.get("link_id") == server_id), None)
        if target_server:
            try:
                source = anikai.resolve_source(target_server["link_id"])
                if source and source.get("iframe_url"):
                    return {
                        "server_name": target_server["name"], 
                        "lang": target_server.get("lang", "sub"),
                        **source
                    }
            except Exception as e:
                return {"error": f"Failed to resolve requested server: {e}"}, 500
        return {"error": "Requested server not found"}, 404

    def is_lang_match(s_lang, target_lang):
        s_lang = (s_lang or "sub").lower()
        target_lang = target_lang.lower()
        if target_lang == "sub":
            return s_lang in ["sub", "softsub", "hardsub", "raw"]
        return s_lang == target_lang

    # Filter by language if strict is requested
    if strict:
        servers = [s for s in servers if is_lang_match(s.get("lang"), lang)]
        if not servers:
            return {"error": f"No {lang} sources found for this episode"}, 404

    def get_score(server):
        name = server.get("name", "").lower()
        server_lang = (server.get("lang") or "sub").lower()
        
        # Priority 1: Language match
        lang_score = 100 if is_lang_match(server_lang, lang) else 0
        # Bonus for exact match
        exact_match = 50 if server_lang == lang else 0
        
        # Priority 2: Quality/Speed preferred servers
        is_mega_like = 10 if ("mega" in name or "server 1" in name or "filemoon" in name) else 0
        
        return (lang_score + exact_match, is_mega_like)

    sorted_servers = sorted(servers, key=get_score, reverse=True)

    last_err = "Failed to resolve any source"
    for server in sorted_servers:
        try:
            server_lang = (server.get("lang") or "sub").lower()
            log.info("Anikai: Resolving %s (%s) for requested lang: %s...", server["name"], server_lang, lang)
            source = anikai.resolve_source(server["link_id"])
            if source and source.get("iframe_url"):
                log.info("Anikai: Successfully selected server: %s", server["name"])
                return {
                    "server_name": server["name"], 
                    "lang": server_lang,
                    **source
                }
        except Exception as e:
            log.warning("Anikai: Server %s failed: %s", server["name"], e)
            last_err = str(e)

    return {"error": last_err}, 500





@app.route("/api/python/resolve/<slug>", methods=["GET"])
@api_response
def api_python_resolve_slug(slug):
    print(f"DEBUG: Resolving slug: {slug}")
    # Try anikai first since we are using it for recent dubs now
    result = anikai.resolve_to_anilist(slug)
    
    print(f"DEBUG: Result: {result}")
    if result:
        return result
    return {"error": "Could not resolve slug"}, 404


@app.route("/api/python/recent-dub", methods=["GET"])
@api_response
def api_python_recent_dub():
    limit = request.args.get("limit", 24, type=int)
    page = request.args.get("page", 1, type=int)
    # Use anikai for dubbed episodes
    data = anikai.get_recent_episodes(type="dub", limit=limit, page=page)
    return {
        "media": data["results"],
        "pageInfo": data["pageInfo"]
    }


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
    payload_hash = hashlib.md5(payload_str.encode()).hexdigest()
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
    
    # Pre-emptive check: If we know we are blocked, don't even try
    if _anilist_status["is_blocked"] and time.time() < _anilist_status["reset"]:
        log.warning(f"AniList Proxy: 🛡️ Circuit Breaker Active (Reset in {int(_anilist_status['reset'] - time.time())}s)")
        use_fallback = True
    else:
        import requests, random
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
                params.append(f"q={requests.utils.quote(search_term)}")
            
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

    full_url = f"https://api.jikan.moe{path}"
    
    # Preserve other query params
    params = request.args.to_dict()
    params.pop("path", None)
    
    log.info(f"Jikan Proxy: 🌐 Fetching {full_url}")
    
    # Reuse retry logic
    j_resp = None
    for attempt in range(3):
        try:
            j_resp = requests.get(full_url, params=params, timeout=10)
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
#  COMMENT SYSTEM API
# ═══════════════════════════════════════════════════════════════════════════════

COMMENTS_FILE = os.path.join(os.path.dirname(__file__), "comments.json")

def load_comments():
    if not os.path.exists(COMMENTS_FILE):
        return {}
    try:
        with open(COMMENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_comments(comments):
    with open(COMMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(comments, f, indent=4)

@app.route("/api/comments", methods=["GET"])
def get_comments():
    anime_id = request.args.get("animeId")
    episode = request.args.get("episode")
    
    if not anime_id or not episode:
        return jsonify({"error": "Missing params"}), 400
        
    all_comments = load_comments()
    key = f"{anime_id}-{episode}"
    return jsonify(all_comments.get(key, []))

@app.route("/api/comments", methods=["POST"])
def post_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        user = data.get("user", "Anonymous")
        avatar = data.get("avatar", "/avatar_placeholder.png")
        content = data.get("content")
        
        if not anime_id or not episode or not content:
            return jsonify({"error": "Invalid data"}), 400
            
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key not in all_comments:
            all_comments[key] = []
            
        import datetime
        new_comment = {
            "id": len(all_comments[key]) + 1,
            "user": user,
            "avatar": avatar,
            "content": content,
            "time": datetime.datetime.now().isoformat(),
            "likes": 0,
            "replies": 0
        }
        
        all_comments[key].insert(0, new_comment) # Newest first
        save_comments(all_comments)
        
        return jsonify(new_comment)
    except Exception as e:
        log.error(f"Comment API Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/comments/vote", methods=["POST"])
def vote_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        action = data.get("action") # 'like' or 'dislike'
        username = data.get("username")
        
        if not anime_id or not episode or not comment_id or not username:
            return jsonify({"error": "Missing data"}), 400
            
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key not in all_comments:
            return jsonify({"error": "Comment not found"}), 404
            
        for c in all_comments[key]:
            if c["id"] == comment_id:
                # Initialize lists if they don't exist
                if "likedBy" not in c: c["likedBy"] = []
                if "dislikedBy" not in c: c["dislikedBy"] = []
                
                if action == "like":
                    if username in c["likedBy"]:
                        c["likedBy"].remove(username)
                    else:
                        if username in c["dislikedBy"]: c["dislikedBy"].remove(username)
                        c["likedBy"].append(username)
                elif action == "dislike":
                    if username in c["dislikedBy"]:
                        c["dislikedBy"].remove(username)
                    else:
                        if username in c["likedBy"]: c["likedBy"].remove(username)
                        c["dislikedBy"].append(username)
                
                # Update counts
                c["likes"] = len(c["likedBy"])
                c["dislikes"] = len(c["dislikedBy"])
                break
                
        save_comments(all_comments)
        return jsonify({"success": True, "likes": c["likes"], "dislikes": c["dislikes"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/comments/delete", methods=["POST"])
def delete_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        username = data.get("username")
        
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key in all_comments:
            for c in all_comments[key]:
                if c["id"] == comment_id and c["user"] == username:
                    c["isDeleted"] = True
                    break
            save_comments(all_comments)
            return jsonify({"success": True})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/comments/edit", methods=["POST"])
def edit_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        username = data.get("username")
        new_content = data.get("content")
        
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key in all_comments:
            for c in all_comments[key]:
                if c["id"] == comment_id and c["user"] == username:
                    c["content"] = new_content
                    break
            save_comments(all_comments)
            return jsonify({"success": True})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    banner = """
    █████╗ ███╗   ██╗██╗██╗  ██╗ ██████╗ 
    ██╔══██╗████╗  ██║██║╚██╗██╔╝██╔═══██╗
    ███████║██╔██╗ ██║██║ ╚███╔╝ ██║   ██║
    ██╔══██║██║╚██╗██║██║ ██╔██╗ ██║   ██║
    ██║  ██║██║ ╚████║██║██╔╝ ██╗╚██████╔╝
    ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝ 
               [ API v3.0 — UNIFIED CORE ]
    """
    log.info(banner)
    log.info("HttpClient ready — 2 engines loaded")
    log.info("Engines: Anikai")
    log.info("Server starting on port 5000...")
    app.run(debug=True, host="0.0.0.0", port=5000)
