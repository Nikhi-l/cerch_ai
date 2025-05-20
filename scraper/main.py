import json
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from typing import List, Dict

from data_fetcher import get_urls
from judge import judge_relevance


def fetch(url: str) -> str:
    """Fetch a URL and return its text."""
    with urlopen(url) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def process_query(query: str, workers: int = 5) -> List[Dict[str, str]]:
    """Fetch pages in parallel and judge their relevance."""
    urls = get_urls(query)
    results: List[str]
    with ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(fetch, urls))

    judged = []
    for url, text in zip(urls, results):
        decision = judge_relevance(query, text)
        judged.append({"url": url, "decision": decision})
    return judged


def main():
    import sys

    query = sys.argv[1] if len(sys.argv) > 1 else "example query"
    output = process_query(query)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

