"""Shared, cached Wikimedia client for regional research workers.

All cooperating workers serialize API AND upload requests through one file
lock. HTTP 429 stops the request and shares its cooldown with every worker.
No endpoint, account, user-agent or proxy rotation is used to evade limits.
"""
from __future__ import annotations

import email.utils
import fcntl
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "content/research/wikimedia-shared-cache"
STATE = Path("/tmp/fish-atlas-wikimedia-rate.json")
LOCK = Path("/tmp/fish-atlas-wikimedia.lock")
USER_AGENT = "FishAtlas/0.6 (https://github.com/korbinjoe/fish-atlas; educational atlas source and photo review)"
INTERVAL = 5.0


class SourceRateLimited(RuntimeError):
    pass


def fetch_bytes(url: str, cache_path: str | Path | None = None) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not (parsed.hostname or "").endswith(("wikipedia.org", "wikidata.org", "wikimedia.org")):
        raise ValueError("This shared limiter is for HTTPS Wikimedia sources only")
    target = Path(cache_path) if cache_path else CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".bin")
    if target.is_file():
        return target.read_bytes()
    LOCK.parent.mkdir(parents=True, exist_ok=True)
    with LOCK.open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if target.is_file():
            return target.read_bytes()
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        now = time.time()
        if state.get("blockedUntil", 0) > now:
            raise SourceRateLimited(f"Wikimedia shared cooldown: {int(state['blockedUntil'] - now)} seconds remain; use cached/local data")
        remaining = INTERVAL - (now - state.get("lastRequest", 0))
        if remaining > 0:
            time.sleep(remaining)
        state["lastRequest"] = time.time()
        STATE.write_text(json.dumps(state))
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=50) as response:
                content = response.read(30 * 1024 * 1024 + 1)
            if len(content) > 30 * 1024 * 1024:
                raise ValueError("Source response exceeds the research cache limit")
        except urllib.error.HTTPError as error:
            if error.code == 429:
                retry = error.headers.get("Retry-After", "")
                try:
                    seconds = float(retry)
                except ValueError:
                    try:
                        seconds = email.utils.parsedate_to_datetime(retry).timestamp() - time.time()
                    except (TypeError, ValueError):
                        seconds = 300
                state["blockedUntil"] = time.time() + max(300, seconds)
                STATE.write_text(json.dumps(state))
                raise SourceRateLimited(f"Wikimedia HTTP 429; all workers paused for {max(300, seconds):.0f}s (Retry-After={retry!r})") from error
            raise
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(target.name + f".tmp-{os.getpid()}")
        temporary.write_bytes(content)
        temporary.replace(target)
        return content


def get_json(base: str, params: dict | None = None, cache_path: str | Path | None = None, **kwargs) -> dict:
    values = {**(params or {}), **kwargs}
    url = base + (("&" if "?" in base else "?") + urllib.parse.urlencode(values) if values else "")
    return json.loads(fetch_bytes(url, cache_path))
