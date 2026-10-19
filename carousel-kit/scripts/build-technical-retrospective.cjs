// Markdown is the public-copy source. Annotation choices never rewrite it.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const kit = path.join(root, 'carousel-kit');
const source = fs.readFileSync(path.join(root, 'docs/build-4-content-strategy/technical-retrospective-carousel.md'), 'utf8');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const maps = {
  1: {title:[['AI','sel','blue']],body:[['failure paths','hl','gold'],['evaluation','under','blue']]},
  2: {title:[['One','circle','blue']],body:[['individual approval','hl','gold']]},
  3: {title:[['model','circle','gold'],['never','hl','blue']]},
  4: {title:[['JSON','circle','blue'],['contract','under','gold']]},
  5: {title:[['fail','circle','gold']],body:[['one retry','hl','blue']]},
  6: {title:[['early','circle','blue']]},
  7: {title:[['Skip','circle','gold']]},
  8: {title:[['visible','hl','gold']],body:[['human review','hl','blue'],['clean STAYING','strike','gold']]},
  9: {title:[['14/14','circle','blue'],['accuracy','strike','gold']]},
  10:{title:[['build','sel','gold']],body:[['shared source','under','blue']]},
  11:{title:[['change next','hl','blue']],body:[['held-out reply set','under','gold']]},
};
const paths = {
  circle:'<svg viewBox="0 0 300 100" preserveAspectRatio="none"><path d="M23,52 C20,20 88,6 160,7 C238,8 286,25 283,53 C280,81 210,95 138,94 C66,93 20,79 17,49 C15,32 32,19 58,11"/><path d="M43,13 C115,1 215,11 269,31 C293,40 296,59 273,73" opacity=".65"/></svg>',
  under:'<svg viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4,12 C62,3 148,4 214,9 C250,12 274,12 296,7"/><path d="M12,18 C72,10 150,11 222,15" opacity=".55"/></svg>',
  strike:'<svg viewBox="0 0 300 12" preserveAspectRatio="none"><path d="M2,7 C74,3 168,10 298,4"/></svg>',
};
function annotation(phrase, type, color='blue') {
  const safe=esc(phrase);
  if(type==='hl') return `<span class="hl${color==='blue'?' hl--blue':''}">${safe}</span>`;
  if(type==='sel') return `<span class="sel${color==='gold'?' sel--gold':''}">${safe}<i></i><i></i><i></i><i></i></span>`;
  return `<span class="pen pen--${type} pen--${color}">${safe}${paths[type]}</span>`;
}
function annotated(s,n,part) {
  let out=esc(s);
  for(const [phrase,type,color] of maps[n]?.[part]||[]) {
    if(!out.includes(esc(phrase))) throw Error(`Slide ${n} missing annotation text: ${phrase}`);
    out=out.replace(esc(phrase),annotation(phrase,type,color));
  }
  return out;
}
const flow=rows=>`<div class="tech-flow">${rows.map(r=>`<p>${r}</p>`).join('')}</div>`;
const diagrams={
  2:flow(['Outreach → Draft → Manager approval → Gmail','Gmail reply → Match → Classify / route → Manager']),
  3:flow(['[R-xxxx] → Exact email → Unmatched alert']),
  4:'<div class="tech-flow tech-schema"><p><strong>Schema excerpt</strong> · Actual configured enum values</p><p><code>urgency: HIGH | MEDIUM | LOW</code><br><code>confidence: HIGH | MEDIUM | LOW</code></p></div>',
  5:flow(['Generate → Validate → Store draft','Failed check → Retry once → REVIEW_FAILED']),
  6:flow([`<strong>Before</strong> · Draft → Check → ${annotation('Edit','strike','gold')} → Send`,`<strong>After</strong> · Draft → Check → Edit → ${annotation('Check','under','blue')} → Send`]),
  7:flow([`<strong>Before</strong> · SENT → Skip → ${annotation('PENDING','strike','gold')}`,`<strong>After</strong> · SENT → Skip → ${annotation('Refused','hl','blue')}`]),
  10:flow(['Shared libraries → Builders → Workflow JSON → Local import']),
  11:flow(['Evaluation · Send integrity · Recovery']),
};
const slides=[...source.matchAll(/### Slide (\d+)\n\n\*\*Title:\*\* ([^\n]+)\n\n\*\*Body:\*\* ([^\n]+)\n\n\*\*Footer:\*\* ([^\n]+)/g)];
if(slides.length!==11)throw Error('Expected eleven complete slide fields');
const shells=slides.map(m=>{
 const n=+m[1],title=m[2],body=m[3],footer=m[4];
 let titleHtml=annotated(title,n,'title');
 if(n===9)titleHtml=titleHtml.replace(annotation('14/14','circle','blue'),`<span class="tech-measure">${annotation('14/14','circle','blue')}</span>`);
 const heading=n===1?`<h1 class="display tech-cover">${titleHtml}</h1>`:`<h2 class="tech-title">${titleHtml}</h2>`;
 let copy=annotated(body,n,'body');
 if(n===9)copy=copy.replace(/evidence\.$/,'');
 const payoff=n===9?`<div><span class="pay tech-pay pen pen--under pen--blue">evidence.${paths.under}</span></div>`:'';
 return `<section class="slide technical technical--ai${n===8?' slide--invert':''}" data-slide="${n}"><div class="eyebrow"><span>APPLIED AI · PRE-RENEWAL CHECK-IN LOOP</span></div><div class="body">${heading}<p class="tech-copy">${copy}</p>${diagrams[n]||''}${payoff}</div><div class="footer"><span>${esc(footer)}</span><b>${String(n).padStart(2,'0')}</b></div></section>`;
});
const example=fs.readFileSync(path.join(kit,'post-06-cautious-design-legal-problem.html'),'utf8');
const snap=example.match(/<script>[\s\S]*?<\/script>/)[0];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>How I built an AI check-in workflow</title><link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800,900&display=swap" rel="stylesheet"><link href="https://api.fontshare.com/v2/css?f[]=zodiak@800,801&display=swap" rel="stylesheet"><link href="carousel-template.css" rel="stylesheet"></head><body>${shells.join('\n')}${snap}</body></html>`;
const out=path.join(kit,'technical-retrospective-renewal-retention.html');
fs.writeFileSync(out,html);console.log(out);
