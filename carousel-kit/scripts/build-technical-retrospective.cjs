// Public prose comes from Markdown; diagram labels explain the same build.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),kit=path.join(root,'carousel-kit');
const source=fs.readFileSync(path.join(root,'docs/build-4-content-strategy/technical-retrospective-carousel.md'),'utf8').replaceAll('\r\n','\n');
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
 2:steps([['Lease ending soon','A date makes the resident eligible for a check-in.'],[a('Still unresolved?','hl','gold'),'A concern needs a conversation to become visible.']]),
 3:lane('Before the message',chain(['Lease dates','Draft check-in',a('Manager review','hl','gold')]))+lane('After approval',chain(['Send check-in','Resident replies','Review + follow up']))+'<div class="v-rail">Each resident-facing follow-up also needs approval.</div>',
 4:`<div class="v-columns"><div class="v-column"><h3>AI helps</h3><p>Prepare a draft</p><p>Sort the reply</p><p>Suggest wording</p></div><div class="v-column"><h3>Manager decides</h3><p>Review concerns</p><p>Choose the response</p><p>${a('Approve each send','sel','blue')}</p></div></div>`,
 5:steps([['One clear question','Ask how things are going.'],[a('Brief and personal','under','blue'),"Use the resident's first name."],['Keep promises out','No renewal offers or rent-increase notices.']]),
 6:lane('The gap',chain(['Check draft','Manager edits','Send']))+`<p class="v-gap">${a('Final wording unchecked','under','gold')}</p>`+lane('The fix',chain(['Manager edits',a('Check again','sel','blue'),'Send'])),
 7:lane('The bug',chain(['Already sent','Tap Skip',a('Queued again','strike','gold')]))+lane('The fix',chain(['Already sent','Tap Skip',a('Keep history','hl','blue')]))+'<p class="v-quiet">Skip is refused once the message has been sent.</p>',
 8:table(['What comes back','What happens'],[['A question','Manager review'],['A concern or unclear reply',a('Manager review','hl','gold')],['AI processing fails',a('Flag for attention','under','blue')]],'v-results'),
 9:`<div class="v-route"><p>The draft</p><p class="v-route-arrow">↓</p><p>The ${a('edit','circle','gold')}</p><p class="v-route-arrow">↓</p><p>The ${a('second click','under','blue')}</p><p class="v-route-arrow">↓</p><p>The unexpected reply</p></div>`,
 10:table(['I checked','Recorded behavior'],[['Draft wording','Passed wording checks'],['Approve twice',a('No second email','under','blue')],['Skip after sending','Skip refused'],['Reply matching',a('Linked to the resident','hl','gold')]],'v-results'),
 11:steps([['Understand difficult replies','Check more ambiguous and sensitive responses.'],['Handle simultaneous approvals','Prevent two approvals sending at the same time.'],[a('Recover interrupted work','hl','gold'),'Reconcile emails that sent but were not recorded.']]),
};
const titleMarks={1:[],2:['attention','under','blue'],4:['decides','hl','gold'],5:['simple','hl','gold'],8:['person','sel','blue'],11:['next','circle','blue']};
const slides=[...source.matchAll(/### Slide (\d+)\n\n\*\*Title:\*\* ([^\n]+)\n\n\*\*Body:\*\* ([^\n]+)\n\n\*\*Footer:\*\* ([^\n]+)/g)];
if(slides.length!==11)throw Error('Expected eleven slide fields');
const shells=slides.map(m=>{
 const n=+m[1],title=m[2],body=m[3],footer=m[4];
 let h=esc(title);
 if(titleMarks[n]?.length){const [word,type,color]=titleMarks[n];if(!h.includes(word))throw Error('Missing title mark');h=h.replace(word,a(word,type,color));}
 let content;
 if(n===1){h='A renewal<br>check-in that<br>starts with<br><span class="pay pen pen--under pen--gold">listening'+paths.under+'</span>';content=`<h1 class="display v-cover">${h}</h1><p class="tech-copy">${esc(body)}</p>`;}
 else {const heading=`<h2 class="tech-title">${h}</h2>`,copy=`<p class="tech-copy">${esc(body)}</p>`,visual=`<div class="v-visual">${diagrams[n]}</div>`;content=heading+visual+copy;}
 return `<section class="slide technical technical--visual${n===9?' slide--invert':''}" data-slide="${n}"><div class="eyebrow"><span>BUILD NOTES · PRE-RENEWAL CHECK-INS</span></div><div class="body">${content}</div><div class="footer"><span>${esc(footer)}</span><b>${String(n).padStart(2,'0')}</b></div></section>`;
});
const example=fs.readFileSync(path.join(kit,'post-06-cautious-design-legal-problem.html'),'utf8');
const snap=example.match(/<script>[\s\S]*?<\/script>/)[0];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>A renewal check-in that starts with listening</title><link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800,900&display=swap" rel="stylesheet"><link href="https://api.fontshare.com/v2/css?f[]=zodiak@700,701,800,801&display=swap" rel="stylesheet"><link href="carousel-template.css" rel="stylesheet"></head><body>${shells.join('\n')}${snap}</body></html>`;
const out=path.join(kit,'technical-retrospective-renewal-retention.html');fs.writeFileSync(out,html);console.log(out);
