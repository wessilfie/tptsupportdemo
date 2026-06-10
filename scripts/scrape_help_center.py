#!/usr/bin/env python3
"""
Scrape all articles from https://help.teacherspayteachers.com/hc/en-us
and save them as markdown files organized by category.
"""

import re
import time
import sys
import csv
from pathlib import Path
from urllib.parse import urlparse

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing beautifulsoup4...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
    from bs4 import BeautifulSoup

try:
    from markdownify import markdownify as md
except ImportError:
    print("Installing markdownify...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdownify"])
    from markdownify import markdownify as md


REPO_ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://help.teacherspayteachers.com"
HOME_URL = f"{BASE_URL}/hc/en-us"
OUTPUT_DIR = REPO_ROOT / "help-center"
ARTICLE_CONTACT_MAP_CSV = Path(__file__).parent / "help_center_contact_topics.csv"
CONTACT_BASE_URL = "https://www.teacherspayteachers.com/Contact?topic="
DEFAULT_CONTACT_TOPIC = "other"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")


def normalize_article_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"


def load_article_contact_map() -> dict[str, dict[str, str]]:
    article_contact_map: dict[str, dict[str, str]] = {}

    if not ARTICLE_CONTACT_MAP_CSV.exists():
        print(f"WARNING: {ARTICLE_CONTACT_MAP_CSV.name} not found. Defaulting contact topics to '{DEFAULT_CONTACT_TOPIC}'.")
        return article_contact_map

    with open(ARTICLE_CONTACT_MAP_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            article_url = normalize_article_url(row.get("article_url", ""))
            if not article_url:
                continue

            topic = row.get("contact_topic", "").strip() or DEFAULT_CONTACT_TOPIC
            contact_url = f"{CONTACT_BASE_URL}{topic}"
            article_contact_map[article_url] = {
                "topic": topic,
                "url": contact_url,
            }

    return article_contact_map


def fetch(client: httpx.Client, url: str) -> BeautifulSoup | None:
    try:
        resp = client.get(url, headers=HEADERS, follow_redirects=True, timeout=30)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return None


def get_categories(soup: BeautifulSoup) -> list[dict]:
    """Extract category links from the homepage."""
    categories = []

    # Try multiple selectors for category links
    selectors = [
        "a.blocks-item-link",
        "a.block-grid-item",
        ".blocks-item a",
        ".category-list a",
        "li.blocks-item a",
        "a[href*='/hc/en-us/categories/']",
    ]

    links = []
    for selector in selectors:
        links = soup.select(selector)
        if links:
            break

    # Fallback: find all links to category pages
    if not links:
        links = soup.find_all("a", href=re.compile(r"/hc/en-us/categories/"))

    seen = set()
    for link in links:
        href = link.get("href", "")
        if not href:
            continue
        if href.startswith("/"):
            href = BASE_URL + href
        if href in seen:
            continue
        seen.add(href)

        name_el = link.find(["span", "h3", "p", "div"])
        name = name_el.get_text(strip=True) if name_el else link.get_text(strip=True)
        if not name:
            continue

        categories.append({"name": name, "url": href, "slug": slugify(name)})

    return categories


def get_articles_from_category(client: httpx.Client, category_url: str) -> list[dict]:
    """Get all article links from a category page (handles sections and pagination)."""
    articles = []
    seen = set()

    # Category pages may list sections, and sections list articles
    soup = fetch(client, category_url)
    if not soup:
        return articles

    # Find section links
    section_links = soup.find_all("a", href=re.compile(r"/hc/en-us/sections/"))

    if section_links:
        for section_link in section_links:
            href = section_link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
            section_name = section_link.get_text(strip=True)
            print(f"    Section: {section_name}")
            time.sleep(0.5)

            section_articles = get_articles_from_section(client, href, seen)
            articles.extend(section_articles)
    else:
        # Category page might directly list articles
        article_links = soup.find_all("a", href=re.compile(r"/hc/en-us/articles/"))
        for link in article_links:
            href = link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
            # Strip query params and fragments
            href = href.split("?")[0].split("#")[0]
            if href in seen:
                continue
            seen.add(href)
            name = link.get_text(strip=True)
            if name:
                articles.append({"name": name, "url": href})

    return articles


def get_articles_from_section(client: httpx.Client, section_url: str, seen: set) -> list[dict]:
    """Get all article links from a section page, handling pagination."""
    articles = []
    page_url = section_url

    while page_url:
        soup = fetch(client, page_url)
        if not soup:
            break

        article_links = soup.find_all("a", href=re.compile(r"/hc/en-us/articles/"))
        for link in article_links:
            href = link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
            href = href.split("?")[0].split("#")[0]
            if href in seen:
                continue
            seen.add(href)
            name = link.get_text(strip=True)
            if name:
                articles.append({"name": name, "url": href})

        # Check for next page
        next_link = soup.select_one("a[rel='next'], .pagination-next-link, a.next_page")
        if next_link and next_link.get("href"):
            next_href = next_link["href"]
            if next_href.startswith("/"):
                next_href = BASE_URL + next_href
            page_url = next_href
            time.sleep(0.5)
        else:
            break

    return articles


def scrape_article(client: httpx.Client, url: str) -> dict | None:
    """Fetch an article and return title + markdown body."""
    soup = fetch(client, url)
    if not soup:
        return None

    # Extract title
    title_el = (
        soup.select_one("h1.article-title")
        or soup.select_one("h1[class*='article']")
        or soup.select_one("article h1")
        or soup.select_one("h1")
    )
    title = title_el.get_text(strip=True) if title_el else "Untitled"

    # Extract article body
    body_el = (
        soup.select_one("div.article-body")
        or soup.select_one("section.article-body")
        or soup.select_one("div[class*='article-body']")
        or soup.select_one("article .content")
        or soup.select_one("div.article__body")
        or soup.select_one("div#article-container")
    )

    if not body_el:
        # Try broader article container
        body_el = soup.select_one("article") or soup.select_one("main")

    if not body_el:
        print(f"    WARNING: No body found for {url}")
        return {"title": title, "body": ""}

    # Convert to markdown
    body_html = str(body_el)
    body_md = md(body_html, heading_style="ATX", bullets="-")

    # Clean up excessive blank lines
    body_md = re.sub(r"\n{3,}", "\n\n", body_md).strip()

    return {"title": title, "body": body_md}


def write_article(
    category_slug: str,
    article_title: str,
    article_url: str,
    content: dict,
    article_contact_map: dict[str, dict[str, str]],
):
    """Write article to markdown file."""
    article_slug = slugify(article_title) or slugify(article_url.split("/")[-1])
    if not article_slug:
        article_slug = "article"

    category_dir = OUTPUT_DIR / category_slug
    category_dir.mkdir(parents=True, exist_ok=True)

    filepath = category_dir / f"{article_slug}.md"

    # Handle duplicate slugs
    if filepath.exists():
        counter = 2
        while filepath.exists():
            filepath = category_dir / f"{article_slug}-{counter}.md"
            counter += 1

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"# {content['title']}\n\n")
        if content["body"]:
            f.write(content["body"])
        contact_info = article_contact_map.get(
            normalize_article_url(article_url),
            {
                "topic": DEFAULT_CONTACT_TOPIC,
                "url": f"{CONTACT_BASE_URL}{DEFAULT_CONTACT_TOPIC}",
            },
        )
        f.write(f"\n\n---\n\nSource: {article_url}\n")
        f.write(f"Contact Us: {contact_info['url']}\n")

    return filepath


def main():
    print(f"Scraping TPT Help Center: {HOME_URL}")
    print(f"Output directory: {OUTPUT_DIR}\n")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    article_contact_map = load_article_contact_map()

    total_categories = 0
    total_articles = 0
    visited_articles = set()

    with httpx.Client(timeout=30) as client:
        # Fetch homepage
        print("Fetching homepage...")
        soup = fetch(client, HOME_URL)
        if not soup:
            print("Failed to fetch homepage. Exiting.")
            sys.exit(1)

        categories = get_categories(soup)

        if not categories:
            print("No categories found! Printing page structure for debugging:")
            # Print first 2000 chars to help debug
            print(soup.prettify()[:2000])
            sys.exit(1)

        print(f"Found {len(categories)} categories\n")

        for cat in categories:
            total_categories += 1
            print(f"Category: {cat['name']} ({cat['url']})")

            articles = get_articles_from_category(client, cat["url"])

            cat_article_count = 0
            for article in articles:
                url = article["url"]
                if url in visited_articles:
                    continue
                visited_articles.add(url)

                print(f"  Article: {article['name'][:60]}")
                time.sleep(0.75)

                content = scrape_article(client, url)
                if content:
                    write_article(cat["slug"], article["name"], url, content, article_contact_map)
                    cat_article_count += 1
                    total_articles += 1

            print(f"  -> {cat_article_count} articles written\n")

    print("=" * 60)
    print(f"Done! Scraped {total_categories} categories, {total_articles} articles")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
