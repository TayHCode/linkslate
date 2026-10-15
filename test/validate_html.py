import pathlib
import sys

try:
    import html5lib
except ImportError:
    print('INCOMPLETE: html5lib is missing; install it in your Python environment.', file=sys.stderr)
    sys.exit(77)

directory = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.scratch/test-out')
files = sorted(directory.rglob('*.html'))
if not files:
    print(f'FAIL: no HTML found in {directory}', file=sys.stderr)
    sys.exit(1)
for path in files:
    try:
        html5lib.HTMLParser(strict=True).parse(path.read_text(encoding='utf-8'))
    except Exception as error:
        print(f'FAIL: {path}: {error}', file=sys.stderr)
        sys.exit(1)
print(f'PASS: html5lib strict validated {len(files)} HTML documents.')
