#!/usr/bin/env python3
"""
generate_borough_facts.py — Generate editorial borough facts via Claude API.

Reads census_processed.json and gla_processed.json, calls claude-sonnet-4-20250514
for each District line borough to generate 4 editorial sentences in the
"This is London" voice, outputs borough_facts_generated.json.

Usage:
  ANTHROPIC_API_KEY=sk-... python scripts/generate_borough_facts.py

The generated facts should be reviewed and merged into demographics.json
using merge_demographics.py.
"""

import json
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA = REPO_ROOT / "backend" / "data"

DISTRICT_LINE_BOROUGHS = [
    "Hammersmith & Fulham",
    "Kensington & Chelsea",
    "City of London",
    "Tower Hamlets",
    "Newham",
    "Barking & Dagenham",
    "Ealing",
    "Hounslow",
    "Richmond upon Thames",
    "Wandsworth",
    "Merton",
    "Havering",
    "Westminster",
]

SYSTEM_PROMPT = """You are a writer for "This is London", a data art installation about the city.
Your voice: precise, slightly poetic, surprising, grounded in specific facts. Never generic.
Never dry statistics only. Each sentence should feel like it was carved, not generated.
Prioritise the surprising, the specific, and the human over the statistical.
Maximum one pure statistics sentence per set — the rest should be cultural, historical, or linguistic."""


def generate_facts_for_borough(borough: str, census: dict, gla: dict) -> list[str]:
    """Call Claude to generate 4 editorial sentences for a borough."""
    try:
        import anthropic
    except ImportError:
        print("anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

    borough_data = {
        "borough": borough,
        "census": census.get(borough, {}),
        "gla": gla.get(borough, {}),
    }

    prompt = f"""Generate exactly 4 editorial sentences about {borough} for the "This is London" data art installation.

Borough data:
{json.dumps(borough_data, indent=2)}

Rules:
- Each sentence must be grounded in a verifiable fact (Wikipedia, ONS, or GLA source)
- Write in the "This is London" voice: precise, slightly poetic, surprising
- Prioritise the cultural, historical, and human over the purely statistical
- At most ONE sentence should be primarily statistical
- Do not invent facts — only state what is verifiable
- Sentences should feel like they belong on a departure board or a plaque, not in a report

Return ONLY a JSON array of 4 strings, nothing else. Example format:
["First sentence.", "Second sentence.", "Third sentence.", "Fourth sentence."]"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
        system=SYSTEM_PROMPT,
    )

    text = message.content[0].text.strip()
    # Extract JSON array from response
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    return []


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("ANTHROPIC_API_KEY not set.")
        print("Usage: ANTHROPIC_API_KEY=sk-... python scripts/generate_borough_facts.py")
        sys.exit(1)

    census_path = DATA / "census_processed.json"
    gla_path = DATA / "gla_processed.json"
    output_path = DATA / "borough_facts_generated.json"

    with open(census_path) as f:
        census = json.load(f)
    with open(gla_path) as f:
        gla = json.load(f)

    results = {}

    for borough in DISTRICT_LINE_BOROUGHS:
        print(f"Generating facts for {borough}...")
        try:
            facts = generate_facts_for_borough(borough, census, gla)
            if facts:
                results[borough] = facts
                print(f"  ✓ {len(facts)} facts generated")
            else:
                print(f"  ✗ No facts returned — skipping")
        except Exception as exc:
            print(f"  ✗ Error: {exc}")
        # Polite rate limiting
        time.sleep(1)

    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nDone. Written to {output_path}")
    print("Review the output, then run merge_demographics.py to integrate.")


if __name__ == "__main__":
    main()
