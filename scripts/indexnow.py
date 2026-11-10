#!/usr/bin/env python3
"""Tell IndexNow search engines (Bing, Yandex, Naver, Seznam; Bing also feeds DuckDuckGo, Yahoo and
ChatGPT search) about new or changed pages on dangochains.com. No account: ownership is the key file
at the site root (<32 hex>.txt, public by design).

  python3 scripts/indexnow.py                  # every URL in the live sitemap.xml
  python3 scripts/indexnow.py URL [URL ...]    # just these

Exit 0 on 200/202. Right after the key file is first published, IndexNow answers 403
SiteVerificationNotCompleted for a while; try again later.
"""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = 'dangochains.com'


def key():
    keys = [os.path.basename(p)[:-4] for p in glob.glob(os.path.join(ROOT, '*.txt'))
            if re.fullmatch(r'[0-9a-f]{32}', os.path.basename(p)[:-4])]
    if len(keys) != 1:
        sys.exit(f'expected one IndexNow key file at the repo root, found {len(keys)}')
    return keys[0]


def sitemap_urls():
    with urllib.request.urlopen(f'https://{HOST}/sitemap.xml', timeout=30) as r:
        return re.findall(r'<loc>([^<]+)</loc>', r.read().decode())


def main():
    k = key()
    urls = sys.argv[1:] or sitemap_urls()
    body = json.dumps({'host': HOST, 'key': k, 'keyLocation': f'https://{HOST}/{k}.txt', 'urlList': urls}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body,
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f'IndexNow {r.status}: {len(urls)} URLs')
    except urllib.error.HTTPError as e:
        print(f'IndexNow HTTP {e.code}: {e.read()[:200].decode(errors="replace")}')
        sys.exit(1)


if __name__ == '__main__':
    main()
