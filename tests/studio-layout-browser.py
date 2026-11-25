"""Browser QA for studio.html. Requires Playwright, Pillow, and Chrome/Chromium.

Run from any directory: python tests/studio-layout-browser.py --out <folder>
Only this browser context sees fixture posts; non-local requests are blocked
except font assets. Artwork is cropped from the supplied reference/studio.png.
"""
import argparse
import io
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CROPS = [(652, 105, 796, 215), (811, 105, 870, 157), (658, 104, 766, 178),
         (652, 223, 720, 295), (728, 223, 795, 309), (874, 162, 944, 260),
         (803, 164, 870, 238), (654, 105, 752, 213), (816, 105, 870, 157)]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def fixture(origin):
    art = Image.open(ROOT / "reference/studio.png").convert("RGB")
    assets, tiles = {}, []
    for i, box in enumerate(CROPS):
        sx, sy = art.width / 1200, art.height / 410
        crop = art.crop(tuple(round(n * (sx if j % 2 == 0 else sy)) for j, n in enumerate(box)))
        buffer = io.BytesIO()
        crop.save(buffer, "JPEG", quality=91)
        path = f"canvas-{i}.jpg"
        assets[f"/__fixture/{path}"] = buffer.getvalue()
        tiles.append(dict(media_type="image", media_url=path, width=crop.width, height=crop.height,
                          content_label="sfw", studio_audience="public"))
    posts = []
    for i, (title, indices) in enumerate([
        ("Character Studies: Field Notes", [0, 1, 2, 3, 4, 5, 6]),
        ("Portrait & Expression Studies", [5, 4, 6, 3, 2]),
        ("Field Uniform Turnaround", [7, 8, 1]),
    ]):
        posts.append(dict(id=f"fixture-post-{i}", title=title, studio_managed=True, is_nsfw=False,
                          is_published=i == 2, story_id="fixture-story", updated_at="2026-11-24T10:00:00Z",
                          caption="Character explorations and costume variations for the archive.",
                          media_post_items=[dict(tiles[n], id=f"item-{i}-{j}", sort_order=j)
                                            for j, n in enumerate(indices)]))
    script = f"""
    window.SITE_CONFIGURATION_STATUS = {{ok: true}};
    window.SUBSCRIPTION_SITE_CONFIG = {{supabase: {{url: 'https://fixture.invalid', anonKey: 'fixture'}}}};
    const posts = {json.dumps(posts)};
    window.supabase = {{createClient: () => ({{
      auth: {{getSession: async () => ({{data: {{session: {{user: {{id: 'fixture-admin'}}}}}}}}),
              onAuthStateChange: callback => {{window.expireFixtureSession = () => callback('SIGNED_OUT', null);}}}},
      from(table) {{
        let rows = ({{
          profiles: [{{id: 'fixture-admin', role: 'admin'}}],
          stories: [{{id: 'fixture-story', title: 'The Archive', is_published: true}}],
          reader_access_tiers: [{{id: 'fixture-tier', name: 'Resident', is_active: true}}],
          media_posts: posts
        }})[table];
        if (!rows) throw Error('Unexpected table ' + table);
        const q = {{select() {{return q;}}, order() {{return q;}},
          eq(key, value) {{rows = rows.filter(row => row[key] === value);return q;}},
          range: (a, b) => Promise.resolve({{data: rows.slice(a, b + 1)}}),
          maybeSingle: () => Promise.resolve({{data: rows[0]}}),
          then: resolve => resolve({{data: rows}})
        }};
        return q;
      }},
      storage: {{from: () => ({{createSignedUrls: async paths => ({{data: paths.map(path =>
        ({{path, signedUrl: '{origin}/__fixture/' + path}}))}})}})}},
      rpc: () => {{throw Error('No writes are allowed in the layout fixture');}}
    }})}};
    """
    return assets, script


def run(browser, origin, out, viewport):
    assets, script = fixture(origin)
    page = browser.new_page(viewport=viewport, device_scale_factor=1, has_touch=viewport["width"] < 500)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def intercept(route):
        url = urlparse(route.request.url)
        if url.path == "/js/subscription/site-bootstrap.js":
            route.fulfill(status=200, content_type="text/javascript", body=script)
        elif url.path == "/vendor/supabase/supabase-2.111.0.min.js":
            route.fulfill(status=200, content_type="text/javascript", body="")
        elif url.path in assets:
            route.fulfill(status=200, content_type="image/jpeg", body=assets[url.path])
        elif url.hostname in {"127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com"}:
            route.continue_()
        else:
            route.abort()

    page.route("**/*", intercept)
    page.goto(origin + "/studio.html")
    page.evaluate("document.fonts.ready")
    suffix = "" if viewport["width"] > 1000 else f"-{viewport['width']}"
    expect(page.locator(".studio-card")).to_have_count(3)

    def capture(name):
        page.mouse.move(0, 0)
        page.evaluate("""async () => {
          const images = [...document.querySelectorAll('img')].filter(img => img.getClientRects().length);
          await Promise.all(images.map(img => {img.loading = 'eager'; return img.decode();}));
          await new Promise(requestAnimationFrame);
        }""")
        assert page.evaluate("document.documentElement.scrollWidth === window.innerWidth")
        page.screenshot(path=out / f"{name}{suffix}.png", animations="disabled")

    capture("all-posts")
    page.locator(".studio-card").first.click()
    expect(page.locator(".studio-tile")).to_have_count(7)

    settings = page.locator("#toggle-settings")
    expect(settings).to_have_attribute("aria-expanded", "false")
    expect(page.locator("#post-settings")).not_to_be_visible()
    expect(page.locator("#save-draft")).to_be_visible()
    expect(page.locator("#save-live")).to_be_visible()
    capture("opened-post")

    first, third = page.locator(".studio-tile").first, page.locator(".studio-tile").nth(2)
    first.focus()
    page.keyboard.press("Space")
    third.click(modifiers=["Shift"])
    expect(page.locator("#selected-count")).to_have_text("3 selected")
    expect(page.locator("#bulk-label")).to_be_visible()
    settings.click()
    expect(settings).to_have_attribute("aria-expanded", "true")
    expect(page.locator("#post-title")).to_have_value("Character Studies: Field Notes")
    expect(page.locator("#settings-heading")).to_be_in_viewport()
    if viewport["width"] > 1000:
        capture("opened-post-inspector")
    page.locator("#close-settings").click()
    expect(settings).to_be_focused()
    expect(page.locator("#post-settings")).not_to_be_visible()
    page.locator("#clear-selection").click()
    expect(page.locator("#bulk-label")).not_to_be_visible()
    expect(page.locator("#select-all")).to_be_focused()

    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    assert page.locator("#save-live").bounding_box()["y"] < viewport["height"] / 2
    page.locator("#back-posts").click()
    page.locator("#post-filter").select_option("published")
    expect(page.locator(".studio-card")).to_have_count(1)
    page.locator("#new-post").click()
    expect(page.locator("#media-files")).to_be_enabled()
    page.locator("#save-draft").click()
    expect(page.locator("#post-title")).to_be_focused()
    page.locator("#close-settings").click()
    image = next(iter(assets.values()))
    page.locator("#media-files").set_input_files({"name": "test.jpg", "mimeType": "image/jpeg", "buffer": image})
    expect(page.locator(".studio-tile")).to_have_count(1)
    expect(page.locator("#save-draft")).to_be_enabled()
    transfer = page.evaluate_handle("""bytes => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], 'drop.jpg', {type: 'image/jpeg'}));
      return data;
    }""", list(image))
    page.locator(".studio-tile").dispatch_event("drop", {"dataTransfer": transfer})
    expect(page.locator(".studio-tile")).to_have_count(2)
    expect(page.locator("#save-live")).to_be_enabled()
    page.evaluate("expireFixtureSession()")
    expect(page.locator("#gate-heading")).to_have_text("Session changed")
    expect(page.locator("#save-live")).not_to_be_visible()
    assert not errors, errors
    print(f"Studio browser checks passed: {viewport['width']} × {viewport['height']}")
    page.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ROOT)) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f"http://127.0.0.1:{server.server_port}"
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(channel="chrome", headless=True)
                for width, height in [(1440, 960), (820, 900), (390, 844)]:
                    run(browser, origin, args.out, {"width": width, "height": height})
        finally:
            server.shutdown()
