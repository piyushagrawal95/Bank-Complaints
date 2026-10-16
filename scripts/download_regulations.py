"""Download official Banking Regulations (Regulation E, etc.) for RAG system."""
import os
import sys
import requests

REGULATIONS = {
    "Regulation_E": {
        "title": "Regulation E (12 CFR Part 1005) - Electronic Fund Transfers",
        "url": "https://www.govinfo.gov/content/pkg/CFR-2024-title12-vol8/pdf/CFR-2024-title12-vol8-part1005.pdf",
        "alt_url": "https://www.govinfo.gov/content/pkg/CFR-2023-title12-vol8/pdf/CFR-2023-title12-vol8-part1005.pdf",
    }
}

DEST_DIR = os.path.join("data", "regulations")
os.makedirs(DEST_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for name, info in REGULATIONS.items():
    dest_path = os.path.join(DEST_DIR, f"{name}.pdf")
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10000:
        print(f"{name}.pdf already exists ({os.path.getsize(dest_path)} bytes). Skipping download.")
        continue

    print(f"Downloading {info['title']}...")
    downloaded = False
    for url in [info["url"], info["alt_url"]]:
        try:
            print(f"Fetching from {url}...")
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200 and len(r.content) > 10000:
                with open(dest_path, "wb") as f:
                    f.write(r.content)
                print(f"Successfully downloaded {dest_path} ({len(r.content):,} bytes)")
                downloaded = True
                break
            else:
                print(f"Status {r.status_code}, response length {len(r.content)}")
        except Exception as e:
            print(f"Error downloading from {url}: {e}")

    if not downloaded:
        print(f"Failed to download {name} automatically.")
        sys.exit(1)

print("All regulations ready in data/regulations/")
