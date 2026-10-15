import base64
import io
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.request import urlopen
from urllib.parse import urlsplit
import zipfile

try:
    from playwright.sync_api import sync_playwright, expect
except ImportError:
    print('INCOMPLETE: Playwright Python is missing. This test requires an existing Chrome over CDP.', file=sys.stderr)
    sys.exit(77)

ROOT = Path(__file__).resolve().parents[1]
SCRATCH = ROOT / '.scratch' / 'editor-e2e'
SHOTS = ROOT / '.scratch' / 'shots'
SCRATCH.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)


def connect(playwright):
    endpoint = os.environ.get('CDP_ENDPOINT')
    if not endpoint:
        print('INCOMPLETE: CDP_ENDPOINT is unset. Set it to the existing Chrome DevTools endpoint (for example, http://HOST:PORT).', file=sys.stderr)
        sys.exit(77)
    try:
        with urlopen(endpoint.rstrip('/') + '/json/version', timeout=3) as response:
            version = json.load(response)
            if not version.get('webSocketDebuggerUrl'):
                raise ValueError('No CDP websocket advertised')
        return playwright.chromium.connect_over_cdp(endpoint, timeout=10000), endpoint
    except Exception as error:
        print(f'INCOMPLETE: Chrome CDP endpoint is unreachable. Check CDP_ENDPOINT.\n{error}', file=sys.stderr)
        sys.exit(77)


def build(text, name, theme=None):
    directory = SCRATCH / name
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / 'links.txt'
    source.write_text(text, encoding='utf-8')
    args = ['node', 'build.mjs', '--input', str(source), '--out', str(directory / 'dist')]
    if theme:
        args += ['--theme', theme]
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    return (directory / 'dist' / 'index.html').read_bytes()


def assert_no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal page overflow'


def check_roundtrip_models(page):
    models = json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import {roundtripModels} from './test/helpers.mjs'; console.log(JSON.stringify(roundtripModels()));",
    ], cwd=ROOT, text=True))
    results = page.evaluate('''models => models.map(model => {
        const bytes = window.Linkslate.buildZipBytes(model);
        const text = window.LinkslateCore.format(model);
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return { text, parsed: window.LinkslateCore.parse(text), zip: btoa(binary) };
    })''', models)
    for index, (model, result) in enumerate(zip(models, results, strict=True)):
        expected = {**model, 'links': [
            {**link, 'label': link['label'] or urlsplit(link['url']).hostname or urlsplit(link['url']).path}
            for link in model['links']
        ]}
        parsed = result['parsed']
        assert parsed.pop('warnings') == []
        assert parsed == expected, f'Seeded editor model {index} changed: {model!r}'
        with zipfile.ZipFile(io.BytesIO(base64.b64decode(result['zip']))) as archive:
            assert archive.testzip() is None
            text = archive.read('links.txt').decode('utf-8')
            assert text == result['text']
            assert archive.read('index.html') == build(text, f'seeded-{index}')
    return len(models)


def run():
    with sync_playwright() as playwright:
        browser, endpoint = connect(playwright)
        if not browser.contexts:
            print('INCOMPLETE: connected Chrome has no existing browser context.', file=sys.stderr)
            sys.exit(77)
        ctx = browser.contexts[0]
        page = ctx.new_page()
        errors = []
        requests = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        try:
            page.set_default_timeout(10000)
            page.goto('about:blank')
            page.set_viewport_size({'width': 1120, 'height': 1000})
            page.set_content((ROOT / 'editor.html').read_text(encoding='utf-8'))
            page.wait_for_function('Boolean(window.Linkslate)')
            page.locator('#name').fill('Zoë “Z” 🌿')
            page.locator('#bio').fill('Design & useful things. Made with care.')
            page.locator('#theme').select_option('sunset')
            page.locator('#link-0-label').fill('<Latest work> & experiments')
            page.locator('#link-0-url').fill('example.com/work?a=1&b=2#hello')
            page.locator('#add-link').click()
            page.locator('#link-3-label').fill('Call me')
            page.locator('#link-3-url').fill('tel:+' + ''.join(['1', '555', '123', '4567']))
            page.get_by_role('button', name='Move up link 4', exact=True).click()
            assert page.locator('#link-2-label').input_value() == 'Call me'
            page.get_by_role('button', name='Move down link 3', exact=True).click()
            assert page.locator('#link-3-label').input_value() == 'Call me'
            page.get_by_role('button', name='Remove link 2', exact=True).click()
            frame = page.frame_locator('#preview')
            assert frame.locator('h1').inner_text() == 'Zoë “Z” 🌿'
            assert frame.locator('html').get_attribute('data-theme') == 'sunset'
            assert frame.locator('a').count() == 3
            assert frame.locator('a').first.inner_text().startswith('<Latest work> & experiments')
            with page.expect_download() as download_event:
                page.locator('#download-zip').click()
            assert download_event.value.suggested_filename.endswith('.zip')
            encoded = page.evaluate('''() => {
                const bytes = window.Linkslate.buildZipBytes();
                let binary = '';
                for (const byte of bytes) binary += String.fromCharCode(byte);
                return btoa(binary);
            }''')
            zip_bytes = base64.b64decode(encoded)
            (SCRATCH / 'linkslate.zip').write_bytes(zip_bytes)
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
                assert archive.testzip() is None
                assert archive.namelist() == ['index.html', 'links.txt', '_headers']
                assert all(entry.compress_type == zipfile.ZIP_STORED for entry in archive.infolist())
                assert all(entry.date_time == (1980, 1, 1, 0, 0, 0) for entry in archive.infolist())
                text = archive.read('links.txt').decode('utf-8')
                html = archive.read('index.html')
                assert html == build(text, 'downloaded'), 'Editor ZIP differs from CLI bytes'
                assert "default-src 'none'" in archive.read('_headers').decode('utf-8')
            with page.expect_download() as text_event:
                page.locator('#download-text').click()
            assert text_event.value.suggested_filename == 'links.txt'
            page.locator('#name').fill('')
            assert page.locator('#download-zip').is_disabled()
            assert 'Add your name' in page.locator('#status').inner_text()
            page.locator('#name').fill('Back again')
            page.locator('summary').click()
            page.locator('#import-text').fill('\ufeff# imported\r\n李 Mei ☀️\r\nA little bio\r\ntheme: paper\r\nSite example.org\r\nEmail mailto:' + '@'.join(['mei', 'example.org']))
            page.locator('#import-button').click()
            assert page.locator('#name').input_value() == '李 Mei ☀️'
            assert frame.locator('h1').inner_text() == '李 Mei ☀️'
            assert frame.locator('a').count() == 2
            for name in ['John.Doe', 'Artist: Alex']:
                page.locator('#name').fill(name)
                expect(frame.locator('h1')).to_have_text(name)
            page.locator('#bio').fill('theme: midnight')
            expect(frame.locator('.bio')).to_have_text('theme: midnight')
            for label in ['Photo:', 'Theme:', '# My site', '']:
                page.locator('#link-0-label').fill(label)
                expect(frame.locator('nav a span:first-child').first).to_have_text(label or 'example.org')
                assert frame.locator('html').get_attribute('data-theme') == 'paper'
                assert frame.locator('a').count() == 2
                assert frame.locator('img').count() == 0
            page.locator('#photo').fill('http://example.invalid/me.jpg')
            expect(page.locator('#status')).to_contain_text('Line 3: photo must start with https://')
            assert frame.locator('img').count() == 0
            page.locator('#import-text').fill('Alex\nhttp://example.invalid/me.jpg\nSite https://example.org')
            page.locator('#import-button').click()
            expect(page.locator('#status')).to_contain_text('Line 2: photo must start with https://')
            assert page.locator('#photo').input_value() == ''
            assert frame.locator('img').count() == 0
            seeded_count = check_roundtrip_models(page)
            page.set_viewport_size({'width': 390, 'height': 1000})
            assert_no_overflow(page)
            page.locator('#preview').scroll_into_view_if_needed()
            page.screenshot(path=str(SHOTS / 'editor.png'), full_page=True)
            assert not errors, '\n'.join(errors)
            assert not [url for url in requests if url.startswith(('http://', 'https://'))], requests
        finally:
            page.close()
        text = (ROOT / 'links.txt').read_text(encoding='utf-8')
        for theme in ['clean', 'midnight', 'sunset', 'paper']:
            page = ctx.new_page()
            try:
                page.goto('about:blank')
                page.set_viewport_size({'width': 390, 'height': 1000})
                html = build(text, f'theme-{theme}', theme)
                page.set_content(html.decode('utf-8'))
                assert_no_overflow(page)
                assert page.locator('html').get_attribute('data-theme') == theme
                assert page.locator('h1').inner_text() == 'Maya Chen'
                page.screenshot(path=str(SHOTS / f'{theme}.png'), full_page=True)
                long_text = 'Alex\nBio ' + 'longword' * 40 + '\n' + 'LongLabel' * 60 + ' https://example.com'
                page.set_content(build(long_text, f'long-{theme}', theme).decode('utf-8'))
                assert_no_overflow(page)
                assert page.locator('a').evaluate('(link) => link.getBoundingClientRect().height') >= 44
                page.screenshot(path=str(SHOTS / f'{theme}-long.png'), full_page=True)
                page.emulate_media(reduced_motion='reduce')
                assert page.locator('a').evaluate('(link) => getComputedStyle(link).transitionDuration') == '0s'
            finally:
                page.close()
        print(f'PASS: existing Chrome over CDP ({endpoint}); editor controls, live preview, download event, ZIP CRC, CLI parity, {seeded_count} seeded model round-trips, reserved labels, dotted/colon names, HTTP-photo warnings, offline editor, four mobile themes and long labels. Screenshots: .scratch/shots/')


if __name__ == '__main__':
    run()
