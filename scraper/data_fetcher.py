from typing import List


def get_urls(query: str) -> List[str]:
    """Return a list of URLs to scrape for a given query."""
    encoded = query.replace(" ", "+")
    # In real usage this would hit a search API or database.
    # Here we just return a few example URLs for demonstration.
    return [
        f"https://example.com/search?q={encoded}&page=1",
        f"https://example.com/search?q={encoded}&page=2",
        f"https://example.com/search?q={encoded}&page=3",
    ]

