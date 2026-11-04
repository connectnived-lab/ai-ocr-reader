import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import run_e2e  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SHOTS = os.path.join(ROOT, "docs")
FIXTURE = os.path.join(HERE, "..", "fixtures", "sample-scan.png")


def mock_reply(body):
    return "Mock cleaned text: INVOICE 4821 total Rs 1,250.00"


def flow(page, mode):
    page.set_input_files("#file", FIXTURE)
    page.wait_for_function("() => document.querySelector('#raw').value.length > 0", timeout=120000)
    raw = page.input_value("#raw")
    assert "4821" in raw, raw
    page.wait_for_selector("#output .stat")
    assert "4821" in page.input_value("#raw")
    if mode == "live":
        page.click("#tidy")
        page.wait_for_function("() => document.querySelector('#output').innerText.includes('Mock cleaned')", timeout=20000)
        assert "Mock cleaned text" in page.inner_text("#output")
    else:
        page.click("#tidy")
        page.wait_for_selector("#error:not([hidden])")
        assert "Live mode" in page.inner_text("#error")


if __name__ == "__main__":
    os.makedirs(SHOTS, exist_ok=True)
    summary = run_e2e(ROOT, flow, mock_reply, shot_dir=SHOTS)
    print(json.dumps(summary))
    print("E2E PASS")
