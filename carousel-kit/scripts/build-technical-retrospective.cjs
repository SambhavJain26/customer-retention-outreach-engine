// Public prose comes from Markdown; diagram labels explain the same build.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),kit=path.join(root,'carousel-kit');
const source=fs.readFileSync(path.join(root,'docs/build-4-content-strategy/technical-retrospective-carousel.md'),'utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const paths={
 circle:'<svg viewBox="0 0 300 100" preserveAspectRatio="none"><path d="M23,52 C20,20 88,6 160,7 C238,8 286,25 283,53 C280,81 210,95 138,94 C66,93 20,79 17,49 C15,32 32,19 58,11"/><path d="M43,13 C115,1 215,11 269,31 C293,40 296,59 273,73" opacity=".65"/></svg>',
 under:'<svg viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4,12 C62,3 148,4 214,9 C250,12 274,12 296,7"/><path d="M12,18 C72,10 150,11 222,15" opacity=".55"/></svg>',
 strike:'<svg viewBox="0 0 300 12" preserveAspectRatio="none"><path d="M2,7 C74,3 168,10 298,4"/></svg>',
};
function a(text,type,color='blue'){
 const s=esc(text);
 if(type==='hl')return `<span class="hl${color==='blue'?' hl--blue':''}">${s}</span>`;
 if(type==='sel')return `<span class="sel${color==='gold'?' sel--gold':''}">${s}<i></i><i></i><i></i><i></i></span>`;
 return `<span class="pen pen--${type} pen--${color}">${s}${paths[type]}</span>`;
}
const chain=(nodes)=>`<div class="v-chain v-chain--${nodes.length}">${nodes.map((n,i)=>`${i?'<div class="v-arrow">→</div>':''}<div class="v-node">${n}</div>`).join('')}</div>`;
const lane=(label,content)=>`<div class="v-lane"><div class="v-label">${label}</div>${content}</div>`;
const table=(headers,rows,cls='')=>`<table class="v-table ${cls}"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const steps=(rows)=>`<ol class="v-steps">${rows.map((r,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><h3>${r[0]}</h3><p>${r[1]}</p></li>`).join('')}</ol>`;
const diagrams={
 2:lane('Outbound',chain(['Outreach','OpenAI<br>draft',a('Approval','hl','gold'),'Action<br>router','Gmail']))+lane('Inbound',chain(['Gmail reply','Match + classify','Manager alert']))+'<div class="v-rail">Airtable · Shared state for both paths</div><p class="v-quiet">Daily operations + reply polling</p>',
 3:`<div class="v-columns"><div class="v-column"><h3>Model</h3><p>Draft wording</p><p>Classify intent</p><p>Suggest next action</p></div><div class="v-column"><h3>Code</h3><p>Select cohorts</p><p>Match ${a('identity','hl','blue')}</p><p>Apply routing rules</p></div></div><div class="v-rail">Subject token → Exact email → Unmatched alert</div>`,
 4:table(['Field / rule','Constraint'],[['intent','enum'],['urgency','HIGH | MEDIUM | LOW'],['confidence','HIGH | MEDIUM | LOW'],['additionalProperties',a('false','under','gold')]],'v-schema'),
 5:steps([[a('Shared libraries','under','blue'),'Cohorts, guardrails, routing'],['Workflow builders + JSON','Placeholders in Git'],['Local import','Resolve local credentials']]),
 6:`<div class="v-root">Generate → Check draft</div><div class="v-branches"><div><h3>PASS</h3><p>Await approval</p></div><div><h3>FAIL</h3><p>Retry ${a('once','circle','blue')}</p><p>↓</p><p>Check again</p><div class="v-outcome">Pass → Await approval<br>Fail → ${a('REVIEW_FAILED','hl','gold')}</div></div></div>`,
 7:lane('Before',chain(['Check','Edit','Send']))+`<p class="v-gap">${a('Unchecked gap','under','gold')}</p>`+lane('After',chain(['Check','Edit',a('Recheck','sel','blue'),'Send']))+'<p class="v-quiet">Validate what will actually send</p>',
 8:`<div class="v-lane--state"><div class="v-label">Before</div><div class="v-transition"><div class="v-state">SENT</div><div class="v-arrow">→</div><div class="v-operation">Skip</div><div class="v-arrow">→</div><div class="v-state">${a('PENDING','strike','gold')}</div></div><p class="v-quiet">Eligible again</p></div><div class="v-lane--state"><div class="v-label">After</div><div class="v-transition"><div class="v-state">SENT</div><div class="v-arrow">→</div><div class="v-operation">Skip<br>Refused</div><div class="v-arrow">→</div><div class="v-state">${a('SENT','hl','blue')}</div></div></div>`,
 9:`<div class="v-route"><p>OpenAI error</p><p class="v-route-arrow">↓</p><p>${a('CLASSIFY_FAILED','hl','gold')}</p><p class="v-route-arrow">↓</p><p>${a('Manager review','under','blue')}</p></div>`,
 10:table(['Check','Recorded result'],[['Draft wording','14 passed'],['Repeated approval',a('No second send','under','blue')],['Skip after sending','Refused'],['Reply matching','Matched by token'],['Classifier generalization',a('Not established','hl','gold')]],'v-results'),
 11:steps([['Evaluation','Held-out labeled replies; measure misses across repeated runs.'],['Send integrity',`${a('Atomic claim','hl','gold')} before sending.`],['Recovery','Reconcile uncertain sends; paginate reads and drain reply backlogs.']]),
};
const titleMarks={2:['One','under','blue'],3:['narrow job','hl','gold'],4:['output contract','hl','blue'],5:['build','sel','gold'],11:['Three','circle','blue']};
const slides=[...source.matchAll(/### Slide (\d+)\n\n\*\*Title:\*\* ([^\n]+)\n\n\*\*Body:\*\* ([^\n]+)\n\n\*\*Footer:\*\* ([^\n]+)/g)];
if(slides.length!==11)throw Error('Expected eleven slide fields');
const shells=slides.map(m=>{
 const n=+m[1],title=m[2],body=m[3],footer=m[4];
 let h=esc(title);
 if(titleMarks[n]){const [word,type,color]=titleMarks[n];if(!h.includes(word))throw Error('Missing title mark');h=h.replace(word,a(word,type,color));}
 let content;
 if(n===1){h=h.replace('AI',a('AI','sel','blue')).replace(' workflow that waits for approval','<br>workflow that<br>waits for<br><span class="pay pen pen--under pen--gold">approval'+paths.under+'</span>');content=`<h1 class="display v-cover">${h}</h1><p class="tech-copy">${esc(body)}</p><p class="v-stack">n8n / OpenAI / Airtable / Gmail / Telegram</p>`;}
 else {const heading=`<h2 class="tech-title">${h}</h2>`,copy=`<p class="tech-copy">${esc(body)}</p>`,visual=`<div class="v-visual">${diagrams[n]}</div>`;content=heading+visual+copy;}
 return `<section class="slide technical technical--visual${n===9?' slide--invert':''}" data-slide="${n}"><div class="eyebrow"><span>APPLIED AI · PRE-RENEWAL CHECK-IN LOOP</span></div><div class="body">${content}</div><div class="footer"><span>${esc(footer)}</span><b>${String(n).padStart(2,'0')}</b></div></section>`;
});
const example=fs.readFileSync(path.join(kit,'post-06-cautious-design-legal-problem.html'),'utf8');
const snap=example.match(/<script>[\s\S]*?<\/script>/)[0];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>An AI workflow that waits for approval</title><link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800,900&display=swap" rel="stylesheet"><link href="https://api.fontshare.com/v2/css?f[]=zodiak@700,701,800,801&display=swap" rel="stylesheet"><link href="carousel-template.css" rel="stylesheet"></head><body>${shells.join('\n')}${snap}</body></html>`;
const out=path.join(kit,'technical-retrospective-renewal-retention.html');fs.writeFileSync(out,html);console.log(out);
