"""Check the public PDF structure, extracted text and flattened image provenance.

Requires pypdf and Pillow. This complements manual review of every rendered
page; it cannot decide whether screenshot content is private or readable.
"""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'output/pdf/renewal-retention-upwork-work-sample.pdf'
ASSETS = ROOT / 'output/work-sample-assets'
reader = PdfReader(PDF)
assert len(reader.pages) == 35
assert not reader.attachments
assert reader.xmp_metadata is None
assert not any(k in reader.trailer['/Root'] for k in
               ('/OpenAction', '/AA', '/AcroForm', '/OCProperties'))
assert set(reader.metadata) == {'/Title', '/Author', '/Subject', '/Creator', '/Producer'}
assert not any(re.search(r'@|https?://|[A-Z]:[\\/]', str(v))
               for v in reader.metadata.values())

def signature(im):
    rgb = im.convert('RGB')
    return (rgb.size, hashlib.sha256(rgb.tobytes()).hexdigest())

approved = {}
for file in ASSETS.glob('*.png'):
    with Image.open(file) as im:
        assert im.mode == 'RGB' and not im.info, file.name
        approved[signature(im)] = file.name

patterns = {
    'email': r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',
    'URL': r'https?://|mailto:|t\.me/|www\.',
    'local path': r'[A-Z]:[\\/]|codex_projects|AppData',
    'private identifiers': r'\b(?:app|tbl|rec|viw)[A-Za-z0-9]{14}\b',
    'internal documents': r'AGENTS\.md|CLAUDE\.md|progress-notes|build-plan|\.env',
    'phone': r'(?<!\d)(?:\+\d{1,3}[ -])?(?:\d[ -]?){10,14}(?!\d)',
}
count = 0
for number, page in enumerate(reader.pages, 1):
    assert not page.get('/Annots'), number
    assert not page.get('/AA'), number
    text = page.extract_text()
    assert f'{number} / 35' in text
    for label, pattern in patterns.items():
        assert not re.search(pattern, text, re.I), (number, label)
    for embedded in page.images:
        assert signature(embedded.image) in approved, (number, embedded.name)
        count += 1

placement_file = ROOT / 'tmp/pdf-revision/image-placement.json'
if placement_file.exists():
    placements = json.loads(placement_file.read_text())
    assert all(0 < row['scale'] <= 1 for row in placements)
    assert len(placements) == count

print(json.dumps({'pages': 35, 'embedded_images': count,
                  'all_images_match_flattened_public_assets': True,
                  'extracted_text_checks': 'passed',
                  'links_annotations_attachments': 0,
                  'metadata': 'generic, no dates or XMP'}, indent=2))
