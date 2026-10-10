"""Render the public case study from reviewed, flattened application captures.

Run with Python + reportlab, Pillow and pypdf. Raw private screenshots are
never read by this renderer; only sanitized assets under output are embedded.
"""
from pathlib import Path
from html import escape
from PIL import Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'output/work-sample-assets'
TMP=ROOT/'tmp/pdf-revision'
TMP.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'output/pdf/renewal-retention-upwork-work-sample.pdf'
for weight,name in [(400,'Manrope'),(700,'ManropeBold')]:
    target=ASSETS/f'manrope-{"regular" if weight==400 else "bold"}.ttf'
    pdfmetrics.registerFont(TTFont(name,str(target)))
W,H=792,612
GREEN=HexColor('#075B42');NAVY=HexColor('#142232');TEXT=HexColor('#27384A')
MUTED=HexColor('#536477');PALE=HexColor('#E7F1EC');BORDER=HexColor('#ADC3B8')
pages=[]; placements=[]
def page(fn):pages.append(fn);return fn
def p(text,x,top,w,size=11.5,bold=False,color=TEXT,leading=None):
    q=Paragraph(escape(text),ParagraphStyle('p',fontName='ManropeBold' if bold else 'Manrope',fontSize=size,leading=leading or size*1.43,textColor=color))
    _,h=q.wrap(w,1000)
    if top-h<52:raise ValueError(f'Text overflow on page {c.getPageNumber()}: {text}')
    q.drawOn(c,x,top-h)
    return top-h
def lab(text,x,y,size=10,color=GREEN):
    c.setFillColor(color);c.setFont('Manrope',size);c.drawString(x,y,text)
def header(kicker,title,sub):
    c.setStrokeColor(GREEN);c.setLineWidth(2.5);c.line(42,584,71,584)
    lab(kicker,42,562)
    size=26
    while pdfmetrics.stringWidth(title,'ManropeBold',size)>708:size-=.5
    p(title,42,541,708,size,True,NAVY,31)
    p(sub,42,502,708,11.5,leading=16)
def image(name,x,top,w,h=None):
    f=ASSETS/(name+'.png');im=Image.open(f);iw,ih=im.size
    scale=min(w/iw,(h/ih if h else w/iw),1.0)
    dw,dh=iw*scale,ih*scale
    # The crop itself is the screenshot. The border is document decoration.
    c.drawImage(ImageReader(im),x+(w-dw)/2,top-dh,width=dw,height=dh)
    c.setStrokeColor(BORDER);c.setLineWidth(.7)
    c.roundRect(x+(w-dw)/2,top-dh,dw,dh,5,fill=0,stroke=1)
    placements.append({'page':c.getPageNumber(),'asset':name,'scale':round(scale,4),'width':round(dw,2),'height':round(dh,2)})
    return top-dh
def note(title,text,x=42,top=160,w=708):
    h=74
    c.setFillColor(PALE);c.roundRect(x,top-h,w,h,7,stroke=0,fill=1)
    p(title,x+14,top-12,w-28,11.5,True,GREEN)
    p(text,x+14,top-32,w-28,11,leading=15)
def bullets(items,x,top,w,size=11.5):
    for text in items:
        c.setFillColor(GREEN);c.circle(x+3,top-7,2.3,fill=1,stroke=0)
        top=p(text,x+17,top,w-17,size)-12
    return top
def blocks(items,x,top,w):
    for title,text in items:
        top=p(title,x,top,w,12,True,NAVY)-6
        top=p(text,x,top,w)-20
    return top
def overview(kicker,title,asset,count,trigger,data,steps,output):
    def draw():
        header(kicker,title,f'Actual n8n editor capture after Tidy Up. All {count} nodes are visible; enlarged branches follow.')
        iw,ih=Image.open(ASSETS/(asset+'.png')).size
        dh=ih*min(708/iw,205/ih,1)
        c.setStrokeColor(BORDER);c.setLineWidth(.7);c.roundRect(42,264,708,205,7,fill=0,stroke=1)
        image(asset,42,469-(205-dh)/2,708,205)
        lab('FULL WORKFLOW / DARK THEME',42,247,9.5)
        blocks([('Trigger and input',trigger+' '+data)],42,224,330)
        blocks([('Key steps and output',steps+' '+output)],405,224,345)
    pages.append(draw)
def two_strips(kicker,title,sub,a,ta,b,tb):
    def draw():
        header(kicker,title,sub)
        bottom=image(a,42,466,708,170)
        p(ta,42,bottom-10,708,11)
        bottom=image(b,42,258,708,150)
        p(tb,42,bottom-10,708,11)
    pages.append(draw)
def evidence(kicker,title,sub,asset,items,imw=420):
    def draw():
        header(kicker,title,sub)
        image(asset,42,466,imw,405)
        blocks(items,42+imw+24,466,708-imw-24)
    pages.append(draw)

@page
def cover():
    header('AUTOMATION CASE STUDY','Pre-renewal grievance detection','Five n8n workflows connect lease timing, AI drafts, human approval, Gmail replies and visible issue tracking.')
    image('air-status',42,466,455,390)
    blocks([
        ('The problem','An expiry list says when a lease ends. A manager still needs a way to ask about unresolved concerns and follow through.'),
        ('What I built','A manager-controlled check-in and reply loop using n8n, Airtable, Telegram, Gmail and OpenAI.'),
        ('Demonstrated outcome','14 drafts prepared, 2 check-ins delivered, 2 replies routed and 1 issue marked resolved by the manager.')
    ],520,466,230)
    p('Actual Airtable records from the preserved synthetic demo.',42,68,455,10.5,color=MUTED)

@page
def problem():
    header('BUSINESS PROBLEM / BUILT SOLUTION','Ask early. Put the answer in front of a person.','The build turns a lease roster into a repeatable check-in, review and issue-follow-up process.')
    blocks([
        ('Before a check-in','Lease dates are available, but preparing personalized messages, following replies and updating issue status takes several manual steps.'),
        ('The working loop','Date rules select the outreach window. OpenAI prepares wording. A manager reviews each message in Telegram before Gmail sends it.'),
        ('After a reply','The automation matches the resident, records the reply and routes concerns with their original wording and a suggested human action.')
    ],42,456,335)
    blocks([
        ('The manager stays in control','Buttons support editing, individual approval, skipping, reply assistance and issue closure. A reply draft needs its own send approval.'),
        ('Visible state','Airtable holds resident status, draft wording, reference codes, replies, issue fields, an event log and summary metrics.'),
        ('The sample you are viewing','Screenshots show real applications and preserved executions from August 2026. Resident identities, properties and reply scenarios are synthetic.')
    ],410,456,340)
    note('Demo boundaries','Gmail, Telegram, OpenAI and Airtable are genuine integrations. A local n8n instance orchestrates them; roster and reply scenarios are demo fixtures.',top=135)

@page
def architecture():
    header('SYSTEM DESIGN','One connected automation','Airtable stores state. n8n moves the data. Telegram is the manager’s action surface.')
    rows=[
        ('01','Outreach generation / WF7','Selected lease window → OpenAI draft → wording checks → Airtable draft → Telegram review card'),
        ('02','Manager actions / WF6','Telegram button or command → current Airtable record → individual approval → Gmail → event log'),
        ('03','Reply processing / WF8','Gmail reply → reference match → routing or classification → Airtable issue → manager alert'),
        ('04','Operations / WF9','Daily schedule or refresh → date cohorts, silence escalation and metrics → Airtable / Telegram digest'),
        ('05','Automatic checks / WF10','Minute timer → silent call to WF8 → new replies processed through the same matching rules')]
    top=461
    for n,t,b in rows:
        lab(n,55,top-13,12);p(t,90,top,660,12.5,True,NAVY);p(b,90,top-24,660,11.2);top-=69
    note('Shared data','Four Airtable tables hold leases, outreach events, configuration and metrics. The model classifies reply text; resident identity comes from deterministic matching.',top=130)

@page
def inputs():
    header('DEMO INPUT / SYNTHETIC ROSTER','Lease dates drive the outreach window','The demo contains 40 synthetic residents. Timing groups are computed from the lease end date.')
    image('air-cohort',42,461,540,225)
    blocks([('Actual input fields','Lease end date, days until expiry and cohort are shown in the populated Airtable table.'),('Same-record journey','The first two rows belong to Avery Brooks at Cedar Row 9 and José Núñez at Cypress 4. Their messages and results appear throughout this sample.')],610,461,140)
    bullets(['The recorded seed produced 14 residents in the 90-day group.',
             'Verified roster checks flagged 8 messy rows for attention rather than dropping them.',
             '120-day records are a watchlist; 90-day check-ins and eligible 60-day nudges produce reviewable drafts. The 30-day stage is a human handoff.'],42,207,708)

overview('WORKFLOW 01 / WF7 OUTREACH','Prepare the check-in queue','wf7-overview',21,
         'A generation request starts the workflow, normally through a manager command.',
         'It reads leases, configuration and prior outreach from Airtable.',
         'Date rules select eligible residents; OpenAI drafts wording; fixed checks allow one retry.',
         'Usable drafts are stored as awaiting approval, and Telegram receives a batch summary and the first review card.')

two_strips('WF7 / READ AND SELECT','Select records before asking the model','Native-zoom captures of the input chain and the candidate decision.',
           'wf7-read','The request enters n8n. Lease rows and settings come from Airtable.',
           'wf7-select','Prior sends and opt-outs are checked. Prepare Touch Batch selects the date-based group; If Has Candidates routes the result.')

@page
def draft():
    header('WF7 / DRAFT AND CHECK','A draft must pass the wording checks','The OpenAI branch and retry decision are captured directly at native editor zoom.')
    bottom=image('wf7-draft',42,466,708,305)
    blocks([('One retry, then visible review','Only failed wording goes to the retry model. A draft that still fails remains for manager wording.')],42,bottom-17,335)
    blocks([('Empty group','The lower branch builds a no-candidate notice instead of calling the drafting model.')],410,bottom-17,340)

two_strips('WF7 / PERSIST AND NOTIFY','Save the wording, then open the review','Draft generation prepares the queue. Individual delivery happens in the manager-actions workflow.',
           'wf7-write','Finalize Drafts prepares lease updates and audit events. Writes are batched in groups of up to ten records.',
           'wf7-cards','Telegram posts the batch summary and first draft card. The response reports what generation produced.')

@page
def generation_proof():
    header('WF7 / ACTUAL EXECUTION AND OUTPUT','Fourteen drafts became a review queue','Preserved execution and conversation from August 24, 2026. All resident data shown is synthetic.')
    image('tg-generation',42,466,360,405)
    image('draft-counts',438,466,297,180)
    blocks([('Execution result','The recorded run completed in 24.373 seconds. Finalize Drafts returned generated_count 14 and review_failed_count 0.'),('Business output','Telegram shows 14 ready for review and Avery’s first draft with reference R-33F8. The buttons offer approval, skip, editing and the next draft.')],438,267,312)

overview('WORKFLOW 02 / WF6 MANAGER ACTIONS','One entry point for every human action','wf6-overview',25,
         'The project’s only Telegram Trigger receives buttons and slash commands.',
         'It reads the current lease and configuration before applying a resident action.',
         'The router separates commands, edits, approvals, assistance and issue closure.',
         'An approved send passes the Gmail gate, updates Airtable and returns a relevant Telegram card.')

@page
def action_entry():
    header('WF6 / ACTION ENTRY','One trigger receives the manager’s actions','Native-zoom capture of Telegram intake and the first routing decision.')
    bottom=image('wf6-entry',42,466,663,170)
    blocks([('Trigger and data','Telegram Trigger receives button callbacks and plain messages. Route Telegram Update turns them into a known action or command.'),('Decision','If Needs Lease Lookup determines whether the action requires a resident record. A button press carries the record context; manager commands dispatch the relevant operation.'),('Human intervention','Editing, individual approval, reply assistance and resolution all enter through this trigger. The next page shows the current-state lookup and command paths.')],42,bottom-22,708)

@page
def action_lookup():
    header('WF6 / CURRENT STATE AND COMMANDS','Read current state before applying the tap','The upper branch handles resident actions. The lower branch dispatches manager commands.')
    bottom=image('wf6-lookup',42,466,680,345)
    p('Resident actions read Airtable and reach Decide Action. Commands become a request to the relevant workflow. Current records are read again before send-time checks are applied.',42,bottom-13,708,11.5)

two_strips('WF6 / APPROVAL AND GMAIL','Only an approved action reaches Gmail','Native-zoom captures make both decisions and node labels readable.',
           'wf6-ai','Reply assistance can call OpenAI. Apply Action checks the action and wording; a draft is still unsent.',
           'wf6-send','If Needs Gmail opens the send path only for the appropriate approved action. Finalize Action reads the send result before preparing updates.')

@page
def action_write():
    header('WF6 / STATE AND AUDIT','Record the result after the action','The workflow keeps message delivery and the manager’s visible state connected.')
    bottom=image('wf6-write',42,466,708,160)
    blocks([('State changes','Finalize Action prepares the lease update, any pending edit state and the outreach event. If Has Writes routes only the needed changes.'),('Delivery evidence','Successful Gmail sends contribute their message identifier to the audit event. A failed send becomes a visible failed status and manager response.'),('Next interaction','After Airtable writes, Build Telegram Reply prepares the next card. Metrics are refreshed from the resulting state.')],42,bottom-22,708)

@page
def cards():
    header('WF6 / MANAGER RESPONSE CARDS','Return the right controls for the next step','These are separate actual closeups of the routing branch and its four card outputs.')
    image('wf6-route',42,466,330,340)
    image('wf6-cards-top',400,466,157,310)
    image('wf6-cards-bottom',593,466,157,310)
    p('Route Card Type selects a draft, suggested reply, resolution or plain response. Each card gives the manager the controls appropriate to that state.',42,110,708,11.5)

evidence('WF6 / HUMAN EDIT AND APPROVAL','The manager edits, then approves Avery’s message','Actual Telegram conversation / synthetic Avery Brooks / reference R-33F8.',
         'tg-approval',[
             ('Edit in context','The conversation shows the edit request, the manager’s replacement text and a refreshed review card.'),
             ('Individual approval','Approve & Send applies to Avery’s message. The next response confirms it was sent to Cedar Row 9.'),
             ('Traceable handoff','R-33F8 stays in the subject so the subsequent Gmail reply can be matched to the same record.')],435)

@page
def gmail_thread():
    header('WF6 / DELIVERY AND REPLY EVIDENCE','The approved check-in reached Gmail','Actual Gmail thread / R-33F8: edited check-in at 03:20, synthetic reply at 03:24. Contact headers redacted.')
    image('gmail-thread',42,466,708,405)

evidence('WF6 / SEPARATE REPLY APPROVAL','Suggested wording stays unsent until approved','Actual Telegram progression from “Draft my reply” to a send confirmation for Avery.',
         'tg-assist',[
             ('Assistance on request','The manager asks for a reply. OpenAI drafts a response using Avery’s maintenance concern.'),
             ('Review before sending','The card states that the wording has not been sent. It offers Send reply, Discard and Edit wording.'),
             ('Confirmed action','The next conversation message says “Reply sent to Avery Brooks.” The delivered email appears on the next page.')],375)

@page
def assist_mail():
    header('WF6 / RECEIVED RESPONSE','The approved response also reached Gmail','Actual Gmail message / R-33F8 / 03:28. The body matches the suggested reply shown in Telegram.')
    bottom=image('gmail-assist',42,466,708,220)
    blocks([('Same subject, same issue','The reference code links the approved response to Avery’s original check-in and maintenance reply.'),('Observable output','The email contains the reviewed wording about the extractor fan and next steps. The outreach event is recorded as ASSIST_SENT.'),('Synthetic demonstration','Both sides of the email exchange use the demo mailbox. The reply content is a synthetic resident scenario transported through genuine Gmail integration.')],42,bottom-20,708)

@page
def duplicate():
    header('WF6 / CONTROLLED STOP','A second approval is refused','Separate recorded verification from August 21, 2026; this is not a second send in the R-33F8 journey.')
    image('duplicate-stop',42,461,400,81)
    blocks([('Actual decision output','Decide Action returned outcome already_sent, needs_gmail false and needs_openai false. The repeated approval did not enter the Gmail branch.'),('Verified related controls','The project also verified that Skip refuses a resident already sent to, and that edited wording must pass the same checks as generated wording.'),('Why this matters','The recorded result demonstrates the refusal path as well as the successful delivery path. A successful workflow status alone would not show that distinction.')],42,343,708)

overview('WORKFLOW 03 / WF8 REPLY PROCESSING','Match the resident, then route the reply','wf8-overview',21,
         'A manual check or the automatic timer calls the reply-check webhook.',
         'Airtable supplies leases, settings and previously logged message identifiers.',
         'Gmail provides new reply candidates. Reference codes match first; remaining text follows routing or structured classification.',
         'The workflow writes reply and issue fields, logs the event, refreshes metrics and posts the appropriate manager alert.')

two_strips('WF8 / INPUT AND SOURCE','Load the context before reading replies','Native editor captures of the request and source-selection steps.',
           'wf8-read','Check Replies reads the lease roster and configuration so every reply can be handled in context.',
           'wf8-select-source','Prior message identifiers are read from the log. Prepare Reply Source chooses genuine Gmail intake or a clearly identified manual fixture path.')

evidence('WF8 / GMAIL AND MANUAL INPUT','One matching process for both input paths','The enlarged branch shows Gmail intake and the manual scenario input used for controlled verification.',
         'wf8-source',[
             ('Genuine Gmail intake','Gmail Search Replies retrieves candidate messages. Select Gmail Reply ignores outbound check-ins and already logged messages.'),
             ('Deterministic identity','A subject reference such as R-33F8 matches first. Sender matching is a fallback; the model never chooses the resident.'),
             ('Manual scenarios','Select Manual Reply supports fixture-based checks. Those checks are separate from the genuine Gmail journey shown here.')],430)

@page
def classification():
    header('WF8 / DECISIONS AND CLASSIFICATION','Route sensitive signals before the model','Actual native-zoom decision branch. The automation preserves the original reply for the manager.')
    bottom=image('wf8-classify',42,466,695,215)
    blocks([('Deterministic routes','Sensitive signals, opt-outs, no-signal cases, duplicates and unmatched messages can finish without a model call.')],42,bottom-20,335)
    blocks([('Structured classification','Other matched replies enter OpenAI. The result supplies intent, category, urgency, confidence and a suggested human action.')],410,bottom-20,340)
    blocks([('Human intervention','Only high-confidence staying replies without a grievance, compliance flag or question qualify for the clean-staying route. Other signals go to a person.')],42,120,708)

@page
def reply_write():
    header('WF8 / RECORD THE REPLY','Persist the decision and prepare the alert','Native-zoom capture of the write branch after reply routing.')
    bottom=image('wf8-write',42,466,708,150)
    blocks([('Lease and log updates','Finalize Reply Route prepares the resident’s reply, intent, issue fields and outreach event. Emit Reply Writes sends the needed updates to Airtable.'),('Manager output','Build Reply Card prepares the quote, classification and next action. The alert type reflects the reply decision.'),('Visible failure handling','When classification is unavailable or unusable, the reply remains a human-review item rather than disappearing from the process.')],42,bottom-22,708)

evidence('WF8 / ALERT OUTPUTS','Put the useful context on the manager’s phone','Actual routing closeup. Metrics refresh follows the same recorded state change.',
         'wf8-alerts',[
             ('At-risk alert','A concern is shown with the original wording, resident context and a suggested action.'),
             ('Sensitive alert','Accommodation and other flagged topics receive an explicit human-review message.'),
             ('Other outcomes','A reply notice communicates other actionable results. Empty automatic checks stay quiet; this workflow has no resident-send path.')],455)

evidence('WF8 / MAINTENANCE OUTCOME','A positive opening still contains a grievance','Actual Telegram progression: Avery’s check-in is sent, then the maintenance reply becomes an alert.',
         'tg-risk',[
             ('What entered','“We’re happy here” is followed by a broken extractor fan and two prior reports.'),
             ('What the automation did','The recorded result is GRIEVANCE / MAINTENANCE / HIGH. It asks the manager to check work-order history and contact the resident.'),
             ('What changed','Avery’s Airtable status becomes AT_RISK. The manager can request a reply draft or record issue resolution.')],435)

evidence('WF8 + WF6 / SENSITIVE REVIEW AND CLOSURE','An accommodation request goes to a person','Actual Telegram conversation / synthetic José Núñez at Cypress 4 / reference R-0545.',
         'tg-resolution',[
             ('Sensitive input','The resident scenario asks about a bathroom grab bar for a family member using a walker.'),
             ('Human review','The alert includes ACCOMMODATION_REQUEST and states that nothing has been sent to the resident.'),
             ('Manager-recorded closure','Mark resolved produces the closure card and an Airtable RESOLVED status. This demonstrates recorded issue closure, not a physical repair or a signed renewal.')],350)

overview('WORKFLOW 04 / WF9 OPERATIONS','Keep timing and metrics current','wf9-overview',18,
         'The daily 08:00 schedule, a sweep request or an internal refresh starts the main branch.',
         'It reads leases, configuration, outreach events and current metrics.',
         'Fixed rules recompute date cohorts and flag prolonged silence; the metric totals come from state and events.',
         'Airtable receives updated fields and the metrics snapshot. An optional Telegram digest reports results; a separate branch handles workflow errors.')

@page
def sweep_input():
    header('WF9 / READ AND RECOMPUTE','Two triggers use the same sweep rules','Native-zoom captures of the triggers, data reads and preparation step.')
    bottom=image('wf9-read',42,466,642,225)
    p('A schedule or sweep request joins the same Airtable read chain.',42,bottom-8,708,11)
    bottom=image('wf9-prepare',42,209,652,133)
    p('Prepare Sweep uses lease dates and logged activity to prepare the cohort, escalation and metric updates.',42,bottom-8,708,11)

two_strips('WF9 / WRITE AND DIGEST','Refresh state, then summarize it','This workflow updates the manager’s view without sending a resident message.',
           'wf9-write','If Has Sweep Writes routes prepared changes through Airtable Write Sweep.',
           'wf9-digest','Build Sweep Digest creates the summary. If Should Post Digest keeps internal silent refreshes from adding routine Telegram messages.')

@page
def errors():
    header('WF9 / EXCEPTION HANDLING','Workflow failures have an alert path','The independent error branch is visible in the actual operations canvas.')
    bottom=image('wf9-error',42,466,708,140)
    blocks([('Trigger','Workflow Error Trigger receives a failure from workflows configured to use the operations error handler.'),('Data movement','Build Error Alert prepares the failure context. Airtable supplies the manager-chat setting, and Attach Error Chat prepares the Telegram destination.'),('Output','Telegram Error Alert surfaces the failure for intervention. Resident sending is not part of the sweep or error workflow.')],42,bottom-25,708)
    note('Recorded behavior','The project verified sweep recomputation, metric refresh and digest output. The error branch shown here documents the implemented routing; it is not a fabricated failure demonstration.',top=135)

@page
def metrics():
    header('WF9 / VERIFIED METRICS','The scoreboard reflects the recorded journey','Actual populated Airtable Metrics table, preserved from the synthetic demo.')
    image('air-metrics-a',42,466,539,67)
    p('14 residents in the outreach window, 2 approved check-ins sent and 2 replies received.',42,385,708,11.5)
    image('air-metrics-b',42,335,361,67)
    p('2 issues found and 1 manager-recorded resolution.',42,254,708,11.5)
    blocks([('How the totals are built','Send and reply counts come from outreach events. Open and resolved issue fields determine the issue totals.'),('Meaning of the exposure figure','The demo uses a configured $3,900 per issue to show open and resolved turnover exposure. The resolution card is a tracking proxy; it does not demonstrate realized savings or a renewal outcome.')],42,212,708)

@page
def auto():
    header('WORKFLOW 05 / WF10 AUTOMATIC CHECKS','Poll replies through the same processing workflow','Actual full canvas after Tidy Up. All three nodes are shown at native zoom.')
    bottom=image('wf10-overview',42,466,670,155)
    blocks([('Trigger and input','Every Minute starts a scheduled check. Build Check Request prepares a silent request to WF8.'),('Key step and output','Run Reply Check calls the shared reply-processing workflow. New messages follow the same matching, routing, logging and manager-alert steps as a manual check.'),('Recorded outcome','The preserved executions that processed Avery’s maintenance reply and José’s accommodation request both entered WF8 with silent checking enabled. New-reply alerts still appeared in Telegram; empty polls do not post routine notices.')],42,bottom-22,708)

@page
def audit():
    header('CONNECTED RESULTS / ACTUAL AUDIT TRAIL','Input, human action and output stay linked','Actual Airtable event log. Private delivery identifiers are excluded from this capture.')
    bottom=image('air-log',42,466,708,220)
    blocks([('Avery / Cedar Row 9 / R-33F8','Edited draft → SENT → REPLY_RECEIVED → ASSIST_SENT. The Telegram and Gmail evidence shows the corresponding actions and wording.')],42,bottom-20,335)
    blocks([('José / Cypress 4 / R-0545','SENT → REPLY_RECEIVED → RESOLVED. The sensitive review and manager-recorded closure appear in the conversation.')],410,bottom-20,340)
    blocks([('What this demonstrates','Genuine integrations, individual send approval and visible state changes. All resident identities and scenarios shown are synthetic.')],42,119,708)

OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,invariant=1)
c.setTitle('Pre-Renewal Grievance Detection | Automation Work Sample')
c.setAuthor('Automation Work Sample')
c.setSubject('Recorded synthetic demonstration with genuine application evidence')
c.setCreator('Automation Work Sample')
for draw in pages:
    draw()
    c.setStrokeColor(BORDER);c.setLineWidth(.7);c.line(42,40,750,40)
    lab('PRE-RENEWAL GRIEVANCE DETECTION / WORK SAMPLE',42,26,8,color=TEXT)
    c.setFont('Manrope',8);c.setFillColor(TEXT);c.drawRightString(750,26,f'{c.getPageNumber()} / {len(pages)}')
    c.showPage()
c.save()
from pypdf import PdfReader, PdfWriter
writer=PdfWriter()
writer.clone_document_from_reader(PdfReader(OUT))
writer.metadata=None
writer.add_metadata({
    '/Title':'Pre-Renewal Grievance Detection | Automation Work Sample',
    '/Author':'Automation Work Sample',
    '/Subject':'Recorded synthetic demonstration with genuine application evidence',
    '/Creator':'Automation Work Sample',
    '/Producer':'Automation Work Sample',
})
with OUT.open('wb') as stream:writer.write(stream)
import json
(TMP/'image-placement.json').write_text(json.dumps(placements,indent=2),encoding='utf8')
print(f'Rendered {len(pages)} pages: {OUT.name}')
