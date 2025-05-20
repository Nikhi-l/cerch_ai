import os
from typing import Literal

try:
    import openai
except ImportError:  # pragma: no cover - openai may not be installed
    openai = None  # type: ignore


def judge_relevance(query: str, content: str) -> Literal['relevant', 'irrelevant']:
    """Use an LLM to judge if the content is relevant to the query."""
    if openai is None:
        # Fallback heuristic when openai package is unavailable
        lowered = content.lower()
        if query.lower() in lowered:
            return 'relevant'
        return 'irrelevant'

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = (
        "You are an impartial judge. Respond with 'relevant' or 'irrelevant' "
        "to indicate whether the provided text answers the user's query."
    )
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Query: {query}\nText: {content[:500]}"},
    ]
    response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages)
    decision = response.choices[0].message.content.strip().lower()
    return 'relevant' if 'relevant' in decision else 'irrelevant'

