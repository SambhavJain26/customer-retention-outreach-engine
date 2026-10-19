// Render the reviewed Markdown fields without rewriting slide copy.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const kit = path.join(root, 'carousel-kit');
const source = fs.readFileSync(path.join(root, 'docs/build-4-content-strategy/technical-retrospective-carousel.md'), 'utf8');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const marks = {
  1: ['check-in', 'sel'], 2: ['lease end dates alone', 'hl'],
  3: ['Airtable holds state', 'hl'], 4: ['exact normalized email match', 'hl'],
  5: ['one Gmail node', 'under'], 6: ['editable', 'circle'],
  7: ['no status guard', 'hl'], 8: ['controls were missing', 'hl'],
  9: ['placeholders', 'hl'], 10: ['sent nothing', 'under'],
  11: ['atomic send claim', 'hl'],
};
function mark(s, n) {
  let out = esc(s), [phrase, type] = marks[n];
  if (!out.includes(phrase)) return out;
  let wrap;
  if (type === 'hl') wrap = `<span class="hl">${phrase}</span>`;
  if (type === 'sel') wrap = `<span class="sel">${phrase}<i></i><i></i><i></i><i></i></span>`;
  if (type === 'under') wrap = `<span class="pen pen--under">${phrase}<svg viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4,12 C62,3 148,4 214,9 C250,12 274,12 296,7"/><path d="M12,18 C72,10 150,11 222,15" opacity=".55"/></svg></span>`;
  if (type === 'circle') wrap = `<span class="pen pen--circle">${phrase}<svg viewBox="0 0 300 100" preserveAspectRatio="none"><path d="M24,53 C21,21 88,7 160,8 C236,9 285,26 282,54 C279,81 212,95 140,94 C70,93 22,79 19,50 C17,34 33,21 57,13"/></svg></span>`;
  return out.replace(phrase, wrap);
}
const slides = [...source.matchAll(/### Slide (\d+)\n\n\*\*Title:\*\* ([^\n]+)\n\n\*\*Body:\*\* ([^\n]+)\n\n\*\*Footer:\*\* ([^\n]+)/g)];
if (slides.length !== 11) throw new Error('Expected eleven complete slide fields');
const diagrams = {
  2: '<div class="tech-flow"><p>Select → Draft and review → Match reply → Track issue</p></div>',
  3: '<div class="tech-flow"><p><strong>Outreach</strong> → Draft → Telegram review → Action router → Gmail</p><p><strong>Gmail reply</strong> → Matching and classification → Airtable + manager alert</p><p><strong>Daily operations + polling</strong> → Refresh state and check for replies</p></div>',
  4: '<div class="tech-flow"><p><strong>Model</strong> · Draft wording + structured classification</p><p><strong>Fixed logic</strong> · Cohorts + identity + flags + routing</p></div>',
  6: '<div class="tech-flow"><p><strong>Before</strong> · Draft → Check → Edit → Send</p><p><strong>After</strong> · Draft → Check → Edit → Check → Send</p></div>',
  7: '<div class="tech-flow"><p><strong>Before the fix</strong> · SENT → Skip → PENDING</p><p><strong>After the fix</strong> · SENT → Skip → Refused</p></div>',
  8: '<div class="tech-flow"><p><strong>Before</strong> · additionalFields.reply_markup · JSON string</p><p><strong>Fix</strong> · replyMarkup + structured buttons</p></div>',
  11: '<div class="tech-flow"><p>Send integrity · Backlog handling · Failure testing</p></div>',
};
const shells = slides.map(m => {
  const n = +m[1], title = m[2], body = m[3], footer = m[4];
  let content;
  if (n === 1) content = `<h1 class="display tech-cover">${mark(title,n)}</h1><p class="tech-copy">${esc(body)}</p>`;
  else if (n === 9) content = `<h2 class="tech-title">${esc(title)}</h2><p class="tech-copy">${mark(body.replace(/Git\.$/, ''),n)}</p><div class="pay tech-pay">Git.</div>`;
  else content = `<h2 class="tech-title">${esc(title)}</h2>${n===5?'<p class="fig tech-figure">88</p>':''}<p class="tech-copy">${mark(body,n)}</p>${diagrams[n]||''}`;
  return `<section class="slide technical${n===5?' slide--invert':''}" data-slide="${n}"><div class="eyebrow"><span>PRE-RENEWAL CHECK-IN LOOP · ${n===1?'BUILD NOTES':'TECHNICAL RETROSPECTIVE'}</span></div><div class="body">${content}</div><div class="footer"><span>${esc(footer)}</span><b>${String(n).padStart(2,'0')}</b></div></section>`;
});
const example = fs.readFileSync(path.join(kit,'post-06-cautious-design-legal-problem.html'),'utf8');
const snap = example.match(/<script>[\s\S]*?<\/script>/)[0];
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>How I built a pre-renewal check-in loop</title><link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800,900&f[]=zodiak@700,701,800,801&display=swap" rel="stylesheet"><link href="carousel-template.css" rel="stylesheet"></head><body>${shells.join('\n')}${snap}</body></html>`;
const out = path.join(kit,'technical-retrospective-renewal-retention.html');
// Separate family requests avoid a combined response omitting the serif face.
fs.writeFileSync(out, html.replace('&f[]=zodiak@700,701,800,801', '').replace('<link href="carousel-template.css"', '<link href="https://api.fontshare.com/v2/css?f[]=zodiak@800,801&display=swap" rel="stylesheet"><link href="carousel-template.css"'));
console.log(out);
