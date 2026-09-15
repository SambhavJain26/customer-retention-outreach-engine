# Production Blueprint: Pre-Renewal Resident Retention and Grievance-Resolution Loop

**Audience:** Property management owners, executives, operations leaders, regional managers, and implementation sponsors

**Purpose:** Business-level design for a production deployment and the single source of reference for an Excalidraw workflow map

**Scope:** US residential property management companies with multiple properties and recurring fixed-term lease expirations
**Core job:** Surface resident concerns early enough to resolve them before the formal renewal process, without allowing automation or AI to make legal, commercial, or resident-facing decisions on its own

> **The system is not a renewal platform.** The company's property-management software continues to control lease data, pricing, offers, notices, documents, and signatures. This system creates an early-warning and follow-through loop before and alongside that process.

---

## 1. Business impact at scale

### Opening scenario: Monday morning inside a 4,800-unit property management company

At 7:30 a.m., before the regional teams begin work, the system has already reviewed the lease calendar across 38 properties. It has found 96 residents who have entered a configured pre-renewal window, moved 21 non-responders to the next follow-up stage, checked whether previously surfaced concerns are still open, and identified three records that cannot safely proceed because of missing or conflicting data.

No employee ran a report. No coordinator copied lease dates into a spreadsheet. No property manager searched an inbox to reconstruct whether a resident had replied.

When the teams begin their day, the work is already organized inside the tools they use:

- Property managers see approval requests for resident check-ins in Microsoft Teams, Slack, Telegram, or the company's existing task queue.
- The maintenance team sees newly created or linked work items in the maintenance system it already operates.
- Regional managers see overdue resident follow-ups and unresolved exceptions in their normal operations dashboard or scheduled digest.
- The leasing team sees thirty-day handoffs in its existing renewal queue. It does not receive another resident message to manage.
- Executives see portfolio measures: residents reached on time, responses received, concerns surfaced, issues resolved before offer, unresolved exposure, and renewal outcomes once the cycle closes.

One resident replies, “We like the apartment, but the bathroom fan has been noisy for months and I reported it twice.” The positive opening does not cause the message to be filed as good news. The system recognizes the unresolved maintenance concern, links the reply to the correct resident through the email conversation reference, checks the existing maintenance system for related work orders, and puts a concise action card in front of the responsible property manager.

The card says what the resident reported, which property and unit are involved, how long remains before the lease ends, whether a related work order exists, who currently owns it, and what the next internal action should be. The system may prepare a proposed acknowledgement, but nothing is sent until an authorized employee reviews and approves that specific message.

The manager opens the existing work order, sees that a vendor visit was closed without a resident confirmation, reopens or creates the appropriate maintenance task, and assigns the follow-up. The resident receives an approved response from the company's normal email address. When the work is completed, the manager marks the issue resolved. The system prepares a short confirmation message, waits for another approval, sends it through the same mailbox, and records whether the resident confirms the issue is genuinely sorted.

At another property, a resident asks for a bathroom grab bar because a family member uses a walker. The system flags the message as an accommodation-related request before ordinary AI classification, applies the company's compliance routing policy, and alerts the designated employee. It does not treat the request as routine maintenance, promise an outcome, or send a response without approval.

At a third property, a resident says the household is relocating for work. The system does not try to “save” the renewal. It records the early departure signal and creates an internal handoff so the leasing team can begin the company's normal planning sooner.

By 8:00 a.m., the company has a controlled queue of work instead of a collection of lease dates, inbox messages, and staff memories.

### Why small time savings become operational capacity

The value is not that any single task is difficult. The value is that the same small tasks repeat across every property and every lease cycle:

- finding the current lease-expiry report;
- checking whether a resident is eligible for contact;
- drafting a message that fits company policy;
- looking up prior contact history;
- recording approval and send status;
- watching for a reply;
- deciding whether the reply is routine or needs attention;
- linking the reply to the correct resident and unit;
- checking for a related maintenance request;
- assigning the next action;
- chasing an unresolved issue;
- confirming closure; and
- reporting the result.

For a 4,800-unit portfolio with mostly annual, staggered leases, an average of about 400 leases may expire each month. The actual pattern will be seasonal, but the scale is useful for illustration. If manual preparation, checking, logging, and routing consume only five minutes per lease event, that is more than 33 hours of repetitive work each month before reply handling begins. If 30% of residents reply and manual inbox review, matching, triage, and logging take eight minutes per reply, that adds another 16 hours. Three minutes of status maintenance across the same 120 replies adds six more hours.

That illustrative portfolio is already at roughly **55 hours of repeatable coordination per month**. It does not include time spent actually talking to residents, resolving maintenance, making renewal decisions, or completing legal paperwork. Those are the activities employees should spend time on.

The automation does not eliminate the human workload. It changes its composition:

- Less time is spent locating, copying, checking, reminding, and updating.
- More time is spent resolving the small number of issues that genuinely require judgment or relationship work.
- Managers review prepared work rather than creating every item from a blank screen.
- Regional leaders manage exceptions and service levels rather than asking whether the process ran.

The capacity effect compounds across properties. Saving four minutes on one resident is unremarkable. Saving four minutes across 4,800 annual cycles is 320 hours. Preventing inbox review from becoming a manual daily sweep adds more. Preventing even one avoidable turnover has a separate financial effect, but the blueprint does not assume or guarantee that result. The client should calculate turnover exposure using its own vacancy loss, make-ready, marketing, concession, and leasing costs.

### Business outcomes the production system is designed to create

The intended business improvements are:

1. **Fewer concerns discovered after the renewal decision.** Residents are asked while there is still time to act.
2. **Less manual administration.** Timing, preparation, matching, logging, reminders, and reporting happen continuously in the background.
3. **Fewer items falling through the cracks.** Every eligible resident, reply, exception, assignment, approval, and closure has a visible state and owner.
4. **Faster follow-up.** Important replies reach the correct person with the relevant context already assembled.
5. **More consistent execution across properties.** The same eligibility rules, message controls, escalation logic, and audit requirements apply to every team.
6. **Better management visibility.** Leaders can see volume, response, issue type, age, ownership, resolution, and renewal outcome without reconstructing the story from several systems.
7. **Lower pressure on property teams.** Automation absorbs repeatable coordination while people retain resident relationships and decision authority.
8. **More portfolio capacity without proportional headcount growth.** A larger lease volume can be handled through exception-based operations instead of adding the same amount of administrative labor.

### What should be measured instead of promised

The production system should be justified through a measured pilot, not an unsupported renewal-rate claim. The first operating measures are:

- percentage of eligible residents reached at the intended time;
- percentage of drafts approved, edited, rejected, or skipped;
- resident reply rate;
- number and type of concerns surfaced;
- percentage of replies requiring human review;
- time from reply to assignment;
- time from assignment to first human action;
- percentage of concerns resolved before the formal renewal offer;
- confirmation rate after an issue is marked resolved;
- non-response and exception aging;
- renewal, non-renewal, and unknown outcomes; and
- turnover exposure and avoided cost calculated only from the client's own accounting and confirmed outcomes.

Renewal impact requires a full lease cycle and a credible baseline or comparison method. “Exposure surfaced” is not revenue earned, and “issue resolved” is not automatically a saved renewal.

---

## 2. Real-world production example

### Company profile used in this example

The example company manages 4,800 residential units across 38 properties in three regional portfolios. It already uses:

- a property-management system for residents, units, leases, renewal offers, and documents;
- a maintenance platform or PMS maintenance module for work orders and vendors;
- Microsoft 365 or Google Workspace for resident email;
- Teams, Slack, or another internal collaboration tool;
- a calendar and task-management process for follow-ups;
- accounting software for vacancy and turnover costs; and
- a reporting or business-intelligence tool for executive dashboards.

The company deploys the retention loop without replacing any of them.

### The operating week

#### Sunday night: portfolio synchronization

The automation receives approved lease and resident data from the PMS. Depending on the PMS, this arrives through a supported API, a scheduled secure report, a managed file transfer, or an approved export dropped into a controlled folder.

It validates each record, preserves existing outreach and consent history, and flags problems rather than silently deleting them. A lease with an ambiguous end date, a resident with no usable email, or a unit whose occupant changed unexpectedly becomes a data exception assigned to the appropriate operations queue.

The PMS remains authoritative for resident identity, unit, property, lease dates, and renewal outcome. The automation keeps only the minimum operational copy needed to run the loop and its audit trail.

#### Monday morning: cohort movement and workload creation

Lease dates move residents through configurable windows:

- **120-day watchlist:** internal visibility and optional work-order review; no resident message.
- **90-day check-in:** a soft resident-experience message is prepared; it contains no rent, offer, deadline, legal notice, or lease term.
- **60-day follow-up:** only residents who did not meaningfully reply to the earlier check-in may receive a lighter follow-up, again only after individual approval and only if the client's policy permits it.
- **30-day handoff:** the system stops resident outreach and transfers the record to the company's normal renewal or leasing process.

Eligibility is determined by lease timing and explicit operational exclusions such as invalid contact data or a recorded opt-out. AI does not decide who is “worth” contacting.

The responsible property manager receives a queue of proposed 90-day check-ins in the collaboration tool the company has selected. Each card shows the resident, property, unit, lease timing, contact history, and proposed message. The manager can approve, edit, skip, or open the resident record. No response from the manager means no send.

#### Tuesday: responses begin arriving

Residents reply through ordinary email. The automation monitors only the approved mailbox or mailbox label used for this process. It matches a reply using the conversation reference and exact sender information. If identity is uncertain, the message goes to an unmatched-reply queue and remains unattached until a person resolves it.

Routine out-of-office responses are logged without creating noise. Clear, high-confidence positive responses with no question or concern are recorded. Anything else becomes an exception requiring a person.

One resident reports a recurring leak. Another asks about parking. A third says the household plans to relocate. A fourth asks about renewal terms. Each reaches a different responsible role:

- possible habitability or safety issue to the property manager and compliance/escalation role;
- parking concern to the site team;
- planned move to leasing;
- renewal question to the authorized renewal specialist.

The message is not merely forwarded. The recipient sees the resident's exact words, property and unit, lease timing, current issue status, related work orders if available, confidence and risk flags, and the next expected action.

#### Wednesday through Friday: resolution and supervision

The maintenance system remains the place where repairs are scheduled, vendors are assigned, and work is completed. The automation can create or link a work order only within the client's approved permissions. It does not select a vendor, approve spend, diagnose a repair, or promise a completion date.

As the maintenance record changes, the automation keeps the retention case current. If the assigned task is overdue, it reminds the owner or escalates under the client's normal service-level rules. If the issue is closed, it asks the manager to confirm that the resident follow-up is ready. The final confirmation message is drafted and checked, but a person must approve it.

If a manager marks a problem resolved without a supporting maintenance status or resident confirmation, the case can move to “resolution pending confirmation” rather than disappearing from the queue.

#### End of week: management visibility

Regional managers receive a concise exception report, not a dump of every successful step. It shows:

- residents waiting for initial approval;
- messages that failed policy checks;
- replies waiting for human review;
- unmatched replies;
- unassigned or overdue issues;
- compliance-sensitive cases;
- failed sends;
- cases marked resolved but not confirmed; and
- thirty-day handoffs not acknowledged by leasing.

Executives see portfolio-level patterns without reading resident correspondence: coverage, response, issue categories, resolution time, aging, property comparisons, and eventual renewal outcomes. Access to verbatim resident messages is restricted by role.

### What has changed for the company

The company has not adopted a second renewal process. Its employees still use the PMS for leases and renewals, the maintenance system for work orders, the mailbox for resident communication, the collaboration platform for team decisions, and the BI layer for executive reporting.

What changed is that the handoffs between those systems are now managed. Lease timing creates work automatically. Replies become structured actions. Actions have owners and due times. Exceptions remain visible. Completion flows back to the resident record and the reporting layer. The business no longer relies on someone remembering to connect those steps manually.

---

## 3. What the production system does

### The production system in one sentence

It continuously turns lease-expiry data into supervised resident check-ins, turns resident replies into assigned operational work, and turns completed work into a documented pre-renewal outcome.

### The business process it owns

The system owns the coordination loop between the company's lease calendar and its formal renewal process:

1. receive approved resident and lease data;
2. validate and reconcile that data;
3. identify timing windows deterministically;
4. assemble relevant operating context;
5. prepare policy-compliant outreach;
6. wait for individual human approval;
7. send through the company's existing communication channel;
8. capture and match replies;
9. identify intent, questions, concerns, urgency, and sensitive categories;
10. route work to the correct human or existing system;
11. track acknowledgement, assignment, progress, and resolution;
12. prepare any follow-up message and wait for another approval;
13. hand the resident back to the existing formal renewal process; and
14. report activity, exceptions, service levels, and outcomes.

### What happens automatically

Subject to the client's approved configuration, the following can occur automatically:

- scheduled synchronization from source systems;
- field mapping, normalization, and validation;
- duplicate detection and record reconciliation;
- lease-day calculation and cohort movement;
- read-only retrieval of related work-order context;
- draft creation;
- fixed policy and wording checks;
- creation of approval cards or tasks;
- mailbox monitoring;
- deterministic reply matching;
- removal of quoted threads and obvious email noise;
- detection of opt-outs, auto-replies, and specified sensitive language;
- AI-supported reply classification and summarization;
- creation or updating of internal tasks within approved rules;
- reminders and escalations based on status and age;
- synchronization of status back to approved systems;
- metric refreshes and scheduled reporting;
- retry handling, health checks, and failure alerts; and
- retention and deletion jobs under the client's policy.

### What always requires a person

The following remain human decisions:

- approving every resident-facing check-in;
- approving every resident-facing reply or resolution confirmation;
- deciding whether and how to resolve a maintenance, service, neighbor, fee, or communication concern;
- deciding what to do with an uncertain resident identity;
- reviewing accommodation, habitability, legal, discrimination, or other compliance-sensitive messages;
- making rent, concession, renewal, negotiation, non-renewal, and legal-notice decisions;
- approving vendor selection, spend, access, inspection, or repair commitments;
- resolving data conflicts that could change who is contacted; and
- overriding a workflow status, with a reason captured in the audit trail.

### What the system deliberately does not own

It does not:

- price renewals;
- recommend rent increases;
- generate or send renewal offers, rent notices, non-renewal notices, notices to vacate, or lease documents;
- sign or modify a lease;
- decide whether a resident should be retained;
- score residents using payment history, protected characteristics, or behavioral risk;
- promise a repair, date, concession, inspection, or outcome;
- select vendors or approve invoices;
- replace the PMS, maintenance platform, accounting system, or document-signing process; or
- send any resident-facing message because a timer expired or a manager failed to respond.

### The operating record created by the system

Every lease cycle becomes a visible case with:

- source resident and lease reference;
- property, unit, responsible team, and timezone;
- eligibility and cohort history;
- data-quality status;
- consent and communication-channel status;
- approved message policy version;
- draft, edits, approver, approved text, and send result;
- resident reply and deterministic match evidence;
- classification, confidence, and sensitive-category flags;
- human assignment, due time, and escalation status;
- linked PMS, maintenance, CRM, calendar, or task references;
- resolution evidence and resident confirmation state;
- thirty-day renewal-process handoff; and
- final renewal or non-renewal outcome when returned by the PMS.

This is the operational memory that prevents work from depending on a particular employee's inbox or recollection.

---

## 4. How it integrates with the existing property management business

### The integration principle

The production design follows a “system of record, system of action, system of orchestration” model:

- **Systems of record** remain where authoritative business data already lives: the PMS, maintenance platform, accounting system, document repository, and CRM.
- **Systems of action** remain where employees already work: email, PMS queues, maintenance boards, Teams, Slack, Telegram, calendars, and task lists.
- **The orchestration layer** runs in the background, moving approved information between them, applying rules, preserving state, and making exceptions visible.

Employees should not need to open a separate application simply to participate in the retention loop.

### How data enters without changing the PMS

The preferred integration order is:

1. **Supported PMS API and webhook:** near-real-time lease, resident, unit, and renewal updates where the client's plan and vendor permit it.
2. **Scheduled secure report:** a daily CSV or structured report delivered to a controlled cloud folder, SFTP location, or mailbox.
3. **Managed export:** an existing report an employee already runs, ingested on an agreed schedule during the pilot.

The system starts read-only wherever practical. Write-back to the PMS is introduced only after the client confirms the destination fields, permissions, ownership, and rollback process.

The company does not have to buy a higher PMS tier merely to prove the workflow. If API access is unavailable or expensive, a scheduled report can run the production process reliably, provided it is monitored and exceptions are visible.

### How employees interact in practice

#### Property managers

They receive approval and exception cards in the company's selected internal channel. A card can provide actions such as Approve, Edit, Skip, Assign, Open resident, Open work order, Mark resolved, and Escalate. Deep links open the source record in the PMS or maintenance platform when further work is required.

#### Maintenance coordinators

They continue to work in the maintenance queue. A retention-related case either links to an existing work order or creates an approved task tagged with the resident, unit, renewal timing, and response due date. Completion flows back automatically.

#### Leasing and renewal staff

They continue to create offers, notices, and lease documents in the PMS. At the configured internal handoff point, they receive the resident's response state, unresolved issues, and any early departure signal. The automation does not compete with or duplicate their legal and transactional process.

#### Regional managers

They see exception aging, unacknowledged assignments, policy failures, and property-level service measures through their existing dashboard, a Teams/Slack digest, or the reporting platform.

#### Executives and owners

They receive portfolio measures and trends. They do not need access to individual resident messages unless their role requires it.

#### Residents

They receive email from the property management company's normal, authenticated sender identity and reply normally. There is no portal, app, bot account, or new login for the resident.

### Integration with maintenance and service history

Maintenance data is valuable context but not an outreach-selection rule. The system can retrieve:

- open work orders for the same unit;
- recently closed or reopened work orders;
- reported category and priority;
- assigned vendor or employee;
- last activity and resident-contact timestamp; and
- completion or resident-confirmation status.

This context helps a manager act quickly when a resident raises a concern. It does not cause the AI to decide who receives a message, and it does not allow the automation to diagnose, schedule, spend, or promise.

### Integration with calendar and task management

When the next action is a call, inspection, or internal review, the automation can create a task or proposed calendar item in the tool the company already uses. Ownership, due time, and completion status synchronize back to the retention case.

The calendar is not treated as proof that the underlying issue was resolved. A completed call task and a completed repair are different facts and remain distinct.

### Integration with accounting and reporting

Accounting supplies approved business measures such as average vacancy loss, make-ready cost, marketing cost, concessions, and leasing cost. The retention dashboard may use these to calculate illustrative turnover exposure.

The automation never creates accounting entries or labels exposure as realized savings. A renewal outcome from the PMS and client-approved financial methodology are required before the business attributes avoided cost.

### When Airtable or a lightweight operational table is still useful

If the client already uses Airtable as an operations surface, it can remain the visible case register. If not, a production database can operate invisibly while statuses and assignments are reflected into the client's PMS, task system, and reporting layer.

Airtable should not be imposed merely because it was useful in the proof of concept. The production goal is adoption through existing work surfaces, not another destination employees must remember to check.

### Implementation and pilot sequence

Although this blueprint describes the finished production design, deployment should be phased:

1. **Discovery and policy mapping:** confirm systems, ownership, lease cadence, approved language, sensitive routes, service levels, and legal boundaries.
2. **Data-only dry run:** synchronize real source data, validate mapping and exceptions, send nothing.
3. **Draft-only cycle:** generate messages for a limited cohort, have the client review every draft, send nothing.
4. **Controlled pilot:** one region or small property group, email only, individual approvals, daily monitoring.
5. **Resolution-loop integration:** link maintenance and task systems, then verify ownership, progress, and confirmation behavior.
6. **Outcome measurement:** run through a full renewal cycle and compare against the client's baseline.
7. **Portfolio rollout:** expand properties only after service levels, exception volume, support capacity, and controls pass agreed gates.
8. **Optional additions:** add a second channel, deeper PMS write-back, approved language support, owner reporting, or controlled experimentation only through separate approval.

The first production cycle should always include heightened monitoring, daily exception review, and a rapid rollback path. The automation earns broader authority by demonstrating predictable behavior under the client's real data, systems, policies, and staff habits.

---

## 5. Major components and why they exist

The names below describe business functions. The specific vendor can change to fit the client's approved stack.

| Component | What it does | Why it is needed | Receives | Sends or updates | Communicates with |
|---|---|---|---|---|---|
| **Property-management system (PMS)** | Holds authoritative residents, units, leases, contacts, property ownership, renewal status, and formal documents | Prevents the automation from becoming a competing lease database | Operational updates entered through normal PMS processes | Approved resident and lease data; renewal outcomes; optional status write-back | Integration gateway, reporting layer, leasing team |
| **Maintenance/work-order system** | Holds repair requests, assignments, vendor activity, completion, and service history | Gives employees the operational context needed to resolve surfaced concerns | Work orders and updates from staff, vendors, or residents | Related work-order context; task status; completion evidence | Orchestration layer, property teams, vendor process |
| **Email platform** | Sends approved messages and receives resident replies using the company's identity | Keeps resident communication in a trusted, familiar channel | Approved message plus resident address; incoming replies | Delivery result, bounce, complaint, reply, conversation identifier | Orchestration layer, resident, audit store |
| **Internal collaboration or task platform** | Presents approvals, assignments, exceptions, and escalations to employees | Lets staff act without logging into a new application | Action cards, alerts, due dates, context, deep links | Approval, edit, skip, assignment, acknowledgement, escalation, resolution action | Orchestration layer, PMS, maintenance, calendar |
| **Calendar/task system** | Makes time-bound human follow-up visible in existing workload | Converts an alert into accountable work | Proposed task, owner, due time, resident and property reference | Completion, reschedule, reassignment | Orchestration layer, responsible employee |
| **Workflow orchestration layer** | Coordinates schedules, events, rules, state transitions, integrations, retries, and alerts | Provides one controlled process across systems that were not designed to manage the handoffs together | Source-system changes, schedules, human actions, AI output, delivery events | Draft requests, approval cards, emails, tasks, system updates, metrics, alerts | Every component in the blueprint |
| **Operational database and audit store** | Maintains workflow state, uniqueness controls, consent, event history, assignments, and evidence | Makes the process reliable, searchable, recoverable, and independent of a single inbox | Normalized source references and every workflow event | Current case state, audit history, reports, exception queues | Orchestration, monitoring, BI, approved administrators |
| **AI drafting service** | Produces first drafts for check-ins, acknowledgements, and resolution confirmations | Reduces blank-page work while allowing company-specific tone | Minimum resident context, approved policy, message purpose, prior issue summary where appropriate | Structured draft text only | Orchestration and policy guardrails |
| **AI classification service** | Converts resident replies into a structured reading of intent, concern type, urgency, and confidence | Helps a high-volume team find signals inside varied natural-language replies | Cleaned reply text and limited approved context | Structured classification and summary | Orchestration and deterministic decision rules |
| **Deterministic policy and safety engine** | Applies fixed eligibility, consent, identity, wording, routing, and send rules | Keeps important boundaries outside probabilistic AI behavior | Source facts, draft or final text, consent state, classification, employee role | Pass, refuse, escalate, or require additional approval with reasons | Orchestration, approval surface, audit store |
| **Integration gateway** | Connects APIs, webhooks, secure files, mailbox events, and approved credentials | Isolates vendor differences and provides controlled permissions | Source events and scheduled exports | Normalized events and confirmed write-backs | PMS, maintenance, email, files, orchestration |
| **Monitoring and incident management** | Detects stale schedules, failed runs, delayed queues, vendor outages, and abnormal volume | Prevents the process from failing quietly | Heartbeats, errors, latency, queue depth, delivery results | Alerts, incident tickets, failover actions | Orchestration, on-call channel, support team |
| **Business intelligence/reporting** | Shows coverage, response, workload, resolution, aging, and renewal outcomes | Gives leaders visibility without exposing all resident correspondence | Aggregated operational and outcome data | Dashboards, scheduled reports, property comparisons | Operational store, PMS, accounting, executives |
| **Identity, access, and secrets management** | Controls who and what can read, approve, edit, send, administer, or audit | Protects resident data and prevents unauthorized action | User roles, service identities, credentials, access policies | Authentication decisions, scoped credentials, access logs | Every protected component |
| **Backup, retention, and recovery services** | Encrypt, retain, delete, back up, and restore data under policy | Makes the system supportable and limits unnecessary personal-data exposure | Database, workflow configuration, audit metadata | Restorable backups, deletion evidence, recovery tests | Operational store, orchestration, security operations |

### Recommended production deployment model

The default is a **client-owned or client-dedicated deployment**:

- one isolated environment for the client rather than a shared resident table across customers;
- hosting in an approved region;
- separate production and non-production environments;
- encrypted connections and storage;
- least-privilege service accounts;
- client-controlled sender identity;
- restricted mailbox or label access;
- off-box encrypted backups with tested restore;
- role-based access and multifactor authentication; and
- documented support, retention, deletion, and incident procedures.

If the orchestration platform's commercial license affects the delivery model, that must be resolved in writing before production. Deploying into client-controlled infrastructure can also simplify ownership and licensing.

### Minimum production data

The system should process only what it needs:

- PMS resident and lease reference IDs;
- resident name and approved communication address;
- property and unit;
- lease start and end dates;
- assigned property or regional team;
- consent and opt-out status;
- limited related work-order references and status;
- resident messages relevant to the active case;
- approval, send, assignment, and resolution history; and
- renewal outcome after the PMS records it.

It should not ingest Social Security numbers, identity documents, screening reports, bank details, card data, full payment ledgers, or unrelated resident records.

---

## 6. How the components communicate

### Communication model

The system uses three kinds of communication:

1. **Events:** Something happened, such as a lease change, reply arrival, work-order update, approval, or send result.
2. **Commands:** An authorized action is requested, such as create task, send approved message, or update case status.
3. **Reconciliation:** A scheduled check confirms that source and workflow state still agree, even if an event was missed.

Events provide speed. Reconciliation provides reliability. A production system needs both.

### Primary information flows

| From | To | Information | Direction and frequency | Control |
|---|---|---|---|---|
| PMS | Integration gateway | Resident, property, unit, lease dates, assigned team, renewal outcome | Event-driven where supported; otherwise scheduled | Approved fields only; source timestamp and record ID retained |
| Integration gateway | Operational store | Normalized source references and validation results | After every received change | Idempotent upsert; conflicts become exceptions |
| Operational store | Orchestration | Eligible cases, current state, consent, ownership, prior events | Scheduled and event-driven | Lease date determines cohort; exclusions are explicit |
| Maintenance system | Orchestration | Related work orders, status, owner, last activity | At case preparation and on change | Read-only first; write access separately approved |
| Orchestration | AI drafting | Minimum approved context and policy | Only when a draft is needed | No authority to send or alter source records |
| AI drafting | Safety engine | Structured draft | Per message | Fixed validation; retry once; failure becomes review item |
| Orchestration | Internal action surface | Draft card, resident context, allowed actions | As work is created or escalated | Role-based actions and expiring action tokens |
| Employee action surface | Orchestration | Approve, edit, skip, assign, resolve, escalate | On explicit employee action | Identity, role, case state, and action are revalidated |
| Orchestration | Email platform | Final approved text, recipient, sender, reference | Per approved message | Send-time policy and consent check; uniqueness key |
| Email platform | Orchestration | Delivery result, bounce, complaint, reply | Event-driven or frequent monitored polling | Processed-message uniqueness and mailbox scope |
| Orchestration | AI classification | Cleaned reply text and limited context | Only for replies not fully handled by fixed rules | Structured schema; timeout and failure route human |
| Safety engine | Operational store | Classification plus deterministic route | Per reply | Human-required decision computed by rules, not model alone |
| Orchestration | Maintenance/PMS/task/calendar | Approved internal task or status update | When route requires work | Permission-scoped; external record ID stored |
| Maintenance/PMS/task/calendar | Orchestration | Assignment and completion updates | Event-driven plus reconciliation | Conflicts remain visible; source system wins for authoritative fields |
| Operational store | BI/reporting | Aggregated state, service levels, and outcomes | Near-real-time or scheduled | Role-based, minimum necessary detail |
| All services | Monitoring | Heartbeat, error, latency, queue depth, vendor status | Continuous | Alerts for stale as well as failed processing |

### Authoritative ownership rules

To avoid competing records, every important fact has one owner:

| Fact | Authoritative owner |
|---|---|
| Resident identity, unit, property, lease dates | PMS |
| Formal renewal offer, notice, document, signature, outcome | PMS and approved document process |
| Maintenance request, vendor assignment, repair completion | Maintenance system or PMS maintenance module |
| Resident email delivery and reply envelope | Email platform |
| Consent/opt-out for this program | Dedicated consent record, synchronized to all channels and any authoritative client system |
| Workflow status, approval evidence, classification, exception, audit event | Operational database |
| Employee task ownership and due date | Client's chosen task/maintenance/PMS system, mirrored in the workflow case |
| Turnover cost and realized financial outcome | Accounting/BI under client-approved methodology |

### Idempotency and duplicate prevention

Every meaningful action receives a unique business key, such as one outreach stage per lease cycle or one processing event per inbound message. Before the system sends, creates, or updates anything, it checks whether that business action has already completed.

This prevents:

- a double-click from sending twice;
- a retried webhook from creating duplicate tasks;
- a repeated export from resetting consent or outreach state;
- two workflow workers from sending the same message concurrently; and
- a mailbox poll from classifying the same reply again.

The visible button can be disabled after use, but the actual protection belongs in the data and state transition, not in the screen.

### State synchronization and conflict handling

The production system never assumes that only automation changes a record. Employees may update the PMS, close a work order, change a resident email, or edit a draft between workflow steps.

Before any irreversible or resident-facing action, the system retrieves fresh state and rechecks:

- resident and lease are still current;
- contact address has not changed;
- resident has not opted out;
- message has not already been sent;
- approver is authorized;
- case is still in the expected stage;
- final text passes current policy; and
- no source-system change has made the action inappropriate.

If records conflict, the system pauses that case and shows the conflicting values rather than guessing.

---

## 7. Human involvement and AI boundaries

### The role of AI

AI is used where language varies and human blank-page work is expensive:

- drafting individualized but policy-bounded check-ins;
- drafting proposed acknowledgements and resolution confirmations;
- reading the meaning of natural-language resident replies;
- identifying likely intent and grievance category;
- summarizing the specific concern in operational language;
- estimating classification confidence; and
- suggesting a human next action.

AI is an assistant to the workflow. It is not an actor with business authority.

### What AI never decides

AI does not decide:

- which residents enter the outreach cohort;
- which resident a reply belongs to;
- whether a message may be sent;
- whether an opt-out can be ignored;
- whether a repair is required or complete;
- whether a resident receives an accommodation;
- what rent, concession, or renewal terms to offer;
- whether to renew or not renew a lease;
- whether a legal notice is valid;
- which vendor to select or how much to spend; or
- whether a case can disappear from human review.

### Layered decision control

The system separates four different responsibilities:

1. **Source facts:** Lease date, resident identity, email envelope, work-order status, and consent come from deterministic records.
2. **AI interpretation:** AI produces a bounded draft or structured interpretation.
3. **Fixed rules:** Code and policy decide whether the output passes, requires a human, or must be refused.
4. **Human authority:** An employee approves communication and makes operational, commercial, legal, and compliance decisions.

This separation makes the system explainable. A manager can see whether a result came from a source record, a fixed rule, an AI interpretation, or a person's decision.

### Handling uncertainty

Uncertainty is not treated as an error to hide. It is a routing condition.

A case requires human review when:

- identity cannot be established deterministically;
- the message contains a question;
- AI confidence is not high;
- intent is mixed, sarcastic, incomplete, multilingual without approved support, or unclear;
- text is absent and the reply is an image or attachment;
- the reply mentions a concern, even if the resident also says they plan to stay;
- fixed and AI classifications disagree;
- source data conflicts; or
- a required integration is unavailable.

The preferred error direction is controlled over-escalation. A person may see more cases, but the system does not silently close a message that needed attention.

### Sensitive and high-risk information

Fixed detection runs before ordinary AI classification for categories the client defines as sensitive, including:

- accommodation or disability-related requests;
- habitability and health or safety concerns;
- legal threats or formal complaints;
- discrimination concerns;
- language-access needs; and
- opt-outs or requests to stop contact.

These cases receive a prominent flag, restricted access where appropriate, a required human owner, and a client-defined response deadline. The system may prepare a proposed response under the latest approved policy, but the flag is never removed and the response never sends automatically. The client can require additional compliance or legal approval for selected categories.

### Message guardrails

Every resident-facing draft is checked when created and again immediately before send. The second check is essential because an employee may edit the wording after generation.

The standard pre-renewal check-in must refuse:

- rent figures, money, percentages, or concessions;
- renewal offers or terms;
- lease changes;
- deadlines or required-response language;
- legal notices or notice-like wording;
- promises of repair dates, inspections, visits, or outcomes;
- claims that the company has already taken an action it has not taken;
- unsupported guarantees; and
- language prohibited by the client's current policy.

A failed draft can be rewritten once. A repeated failure becomes a visible “manager wording required” item. It is never silently passed and never silently discarded.

### Approval design

Each outbound message requires a distinct approval tied to:

- resident and lease cycle;
- exact message purpose;
- exact final text;
- approver identity and role;
- policy version;
- timestamp; and
- current case state.

Approval of an initial check-in does not approve a later reply. Approval of a reply does not approve a resolution confirmation. Editing approved text invalidates the prior approval and requires a new one.

### Fair and consistent cohorting

Resident selection is based on lease end date and explicit operational exclusions only. Work-order history may change the context shown to a manager but not whether a resident receives the standard opportunity to be contacted.

Any future proposal to prioritize or exclude residents using payment behavior, complaint history, predicted renewal likelihood, property profitability, language, family status, disability, or other personal characteristics is a separate policy and compliance project. It is not part of this blueprint.

---

## 8. End-to-end production workflow

This section follows one lease cycle from source event to completed or handed-off work. The numbered labels are designed to become process nodes in the Excalidraw map.

### Phase A: source data and eligibility

**P01 — Lease or resident record changes in the PMS**
A lease is created, amended, renewed, ended, or moved closer to a configured date window. A resident contact or unit assignment may also change.

**P02 — Integration receives the change**
The event arrives through an API/webhook or the next scheduled report. The event includes source IDs and timestamps.

**D01 — Is the source event complete and recognizable?**

- **Yes:** continue to P03.
- **No:** create E01 Data exception; assign it; do not contact the resident.

**P03 — Normalize and reconcile**
The system maps fields, validates dates and contact information, checks duplicates, preserves prior consent and workflow state, and compares the new source version with the current case.

**D02 — Is there a material conflict?**

- **No:** continue to P04.
- **Yes:** create E02 Source conflict; show both values; pause affected resident actions.

**P04 — Calculate days to lease end and cohort**
The calculation uses the property or client timezone and lease end date only.

**D03 — Which timing window applies?**

- **Outside active windows:** store current state; no work.
- **120-day watchlist:** continue to P05; no resident message.
- **90-day check-in:** continue to P07.
- **60-day follow-up:** evaluate D07 later.
- **30-day internal handoff:** go to P30.
- **Expired/ended/renewed:** close or archive active pre-renewal work under policy.

**P05 — Assemble internal context**
Retrieve related open/recent work orders, existing retention case state, assigned property team, and prior approved communication history.

**P06 — Create watchlist visibility**
Show the resident in the appropriate PMS view, operations dashboard, or regional report. No resident message is created solely because the resident entered the 120-day window.

### Phase B: 90-day check-in

**P07 — Recheck eligibility**
Confirm lease is current, resident identity is current, email is usable, consent permits contact, no equivalent message was sent for this lease cycle, and no source conflict is open.

**D04 — Eligible for check-in?**

- **Yes:** continue to P08.
- **No, correctable:** create E03 Eligibility exception and assign it.
- **No, opted out or already sent:** record the reason and stop this stage.

**P08 — Build minimum drafting context**
Use first name, tenure, company identity, manager identity, property-specific tone policy, and message purpose. Do not send unrelated resident data to the AI service.

**P09 — AI prepares a structured draft**
The draft asks one open question about anything unresolved. It does not discuss renewal terms, money, deadlines, or notices.

**P10 — Run draft policy checks**

**D05 — Does the draft pass?**

- **Yes:** store it and continue to P11.
- **No, first failure:** return the specific failure for one controlled rewrite, then recheck.
- **No, repeated failure or AI unavailable:** create E04 Manager wording required; preserve visibility; do not send.

**P11 — Deliver approval card or task**
Place the exact draft and relevant context in the manager's existing action surface.

**D06 — What does the manager do?**

- **Approve:** continue to P13.
- **Edit:** P12 Store edited text, invalidate any previous approval, and return to P10.
- **Skip:** record approver and reason; stop this stage.
- **Assign for review:** move ownership and due time; remain pending.
- **Ignore:** remain pending; remind or escalate internally under SLA; never auto-send.

**P13 — Final send-time revalidation**
Fetch fresh PMS/contact/consent/case state and run the current wording policy against the exact final text.

**D07 — Still safe and valid to send?**

- **Yes:** continue to P14.
- **No:** refuse, record reasons, and return to the responsible employee.

**P14 — Reserve unique send action**
Atomically claim the one allowed 90-day send for this lease cycle. A retry or second approval cannot claim it again.

**P15 — Send through company mailbox**
Use the client's authenticated sender identity and a traceable conversation reference.

**D08 — Did delivery succeed?**

- **Accepted:** P16 record send, delivery identifiers, approver, exact text, and timestamp.
- **Temporary failure:** E05 retry with backoff while keeping status visible.
- **Permanent failure/bounce:** E06 create contact/delivery exception; alert owner; do not treat as contacted.

### Phase C: resident reply and triage

**P17 — Resident replies normally by email**
The email platform produces a mailbox event or the monitored mailbox check finds the message.

**P18 — Deduplicate the inbound message**
Use provider message ID and conversation reference so the same email is processed once.

**P19 — Match reply deterministically**
Use the embedded conversation reference first and exact approved sender address second.

**D09 — Is there one confident resident match?**

- **Yes:** continue to P20.
- **No or multiple:** create E07 Unmatched reply; attach to nobody; alert human resolver.

**P20 — Clean the reply**
Remove quoted prior messages, standard signatures, and transport noise while preserving the verbatim original in the restricted audit record.

**D10 — Is it an automatic or empty response?**

- **Yes:** P21 log `NO_SIGNAL`; leave resident state unchanged; no ordinary alert.
- **No:** continue to P22.

**P22 — Run fixed sensitive-category and opt-out detection**
Apply deterministic rules before general AI interpretation.

**D11 — Is it an opt-out?**

- **Yes:** P23 write permanent cross-channel consent state, stop future outreach, notify assigned human, and audit.
- **No:** continue to P24.

**P24 — AI classifies and summarizes**
Return fixed fields for intent, grievance presence and category, urgency, sensitive-category flag, suggested human action, and confidence.

**P25 — Apply deterministic routing rules**
Human review is required for any grievance, question, mixed or leaving intent, sensitive flag, unclear meaning, low/medium confidence, or fixed/AI disagreement.

**D12 — Is it a clean, high-confidence positive with no question or concern?**

- **Yes:** P26 record positive response, update case, and keep it visible for reporting. No urgent alert.
- **No:** continue to P27.

**P27 — Open or update a retention issue**
Assign category, owner, due time, urgency, resident quote, source links, and the next expected human action.

**P28 — Correlate maintenance or service context**
Search for related work orders or service records and attach links. Do not auto-merge uncertain records.

**D13 — Is there a clearly related open work item?**

- **Yes:** link the retention issue and notify the existing owner.
- **No:** create a proposed or approved internal task according to client policy.
- **Uncertain:** require a human to link or create the work item.

**P29 — Alert and assign in existing tools**
Send a person-sized action card and create/synchronize the task. Sensitive cases receive the client-defined additional route and response deadline.

### Phase D: human response and issue resolution

**P31 — Employee reviews the resident's words and source context**
The employee decides the correct operational response and updates the source system as required.

**D14 — Should a resident acknowledgement be sent?**

- **Yes:** P32 request a draft or write one manually.
- **No:** record reason and continue internal work; the case remains open.

**P32 — Prepare acknowledgement draft**
AI may draft from the approved issue facts and company policy. The employee can edit it.

**P33 — Validate and approve exact acknowledgement**
Run message-specific guardrails and require an authorized individual approval.

**D15 — Approved and still valid?**

- **Yes:** P34 reserve unique send and deliver through the company mailbox.
- **No:** keep pending or record discard; nothing sends.

**P35 — Perform operational work in source systems**
Maintenance, leasing, compliance, or property staff use their normal tools and authority.

**P36 — Synchronize assignment and progress**
The automation reflects owner, status, due time, last action, and source links in the retention case.

**D16 — Is work overdue, stalled, or unacknowledged?**

- **No:** continue monitoring.
- **Yes:** P37 remind, then escalate according to the client's defined chain; never send a resident commitment automatically.

**D17 — Has the source work been completed?**

- **No:** remain open.
- **Yes:** P38 move to `RESOLUTION_PENDING_CONFIRMATION` rather than closing invisibly.

**P39 — Prepare resident confirmation message**
Ask whether the specific issue is now sorted. Run policy checks and require a new approval.

**D18 — Confirmation approved and delivered?**

- **Yes:** wait for resident confirmation or client-defined closure rule.
- **No:** remain pending and visible.

**D19 — Does the resident confirm resolution?**

- **Yes:** P40 close as confirmed, record resolution time and evidence.
- **No, still a problem:** P41 reopen or continue the issue, preserve history, reassign and escalate as needed.
- **No response:** remain `RESOLUTION_UNCONFIRMED` until the client's aging rule permits a documented administrative closure.

### Phase E: later cadence and renewal handoff

**D20 — At 60 days, was there a meaningful earlier reply?**

- **Yes:** no generic nudge; continue issue handling or normal internal tracking.
- **No:** P42 prepare the client-approved lighter follow-up, then repeat individual drafting, validation, approval, uniqueness, and delivery controls.
- **Opted out, invalid contact, conflict, or already handled:** no send; record reason.

**P30 — Thirty-day internal handoff**
Create or update the renewal-team work item with response state, known unresolved concerns, early departure signal, and source links. The automation sends no resident check-in at this stage.

**P43 — Existing renewal process operates**
Authorized staff use the PMS and approved legal/document process for pricing, offers, notices, negotiation, and signatures.

**P44 — Renewal outcome returns from PMS**
The system records renewed, non-renewed, month-to-month, pending, or unknown outcome without inventing causation.

**P45 — Reporting closes the cycle**
Aggregate coverage, responses, concerns, service levels, confirmed resolutions, unresolved cases, and outcomes. Financial attribution uses the client's approved methodology.

### Phase F: continuous operations

**P46 — Daily reconciliation sweep**
Recalculate timing, compare source and workflow state, identify missed events, age assignments, and refresh reporting.

**P47 — Heartbeat and watchdog**
Every critical scheduled process writes a heartbeat. A separate watchdog alerts if a job has not run, even when no ordinary error was emitted.

**P48 — Retention and deletion**
Delete or archive resident content, execution payloads, and expired cases according to written policy while preserving only permitted audit metadata.

**P49 — Backup and restore verification**
Backups run automatically. Restore tests occur on a documented schedule so recovery is demonstrated rather than assumed.

---

## 9. Exceptions and edge cases

### Exception operating rule

An exception must have five things: a visible status, a reason, an owner, a next action, and an age. “Logged” is not the same as “managed.”

| Exception | System response | Human owner | Resident impact | Resolution evidence |
|---|---|---|---|---|
| Missing or invalid email | Exclude from send; create data-quality task | Property operations | No message | Corrected source record or approved alternate channel |
| Ambiguous/missing lease end date | No cohort; show conflict | PMS data owner | No message | Corrected authoritative date |
| Duplicate or changed occupancy | Pause affected actions; compare source IDs and effective dates | Property operations | No message until resolved | Confirmed current resident/lease |
| Re-upload or repeated source event | Reconcile roster-owned fields; preserve workflow, consent, and send state | Automatic unless conflict | No duplicate message | Idempotency record and source version |
| Manager edits unsafe wording | Refuse at send time with exact reasons | Approver | No message | Corrected text and new approval |
| Manager approves twice | Second action refused by state and uniqueness control | Automatic | One message only | Single send record |
| Manager skips after send | Refuse impossible transition | Automatic/manager informed | No state rewind | Audit event showing refusal |
| Resident opted out | Store permanent cross-channel consent state; stop future outreach | Program owner for confirmation | No future program outreach | Consent event and channel sync |
| Bounce or mailbox rejection | Retry temporary failures; create delivery exception for permanent failure | Property operations | May not receive message | Corrected contact or documented no-contact outcome |
| Reply from different address | Try only approved deterministic evidence; otherwise unmatched queue | Property operations | Reply receives no automated response | Human-confirmed resident link |
| Forwarded spouse/roommate reply | Do not guess; show conversation and lease participants | Property operations | No automated response | Human match with recorded basis |
| Subject/reference removed | Exact sender fallback only if unambiguous; otherwise unmatched | Property operations | No automated response | Human resolution |
| Multiple residents share an address | Require conversation reference or human match | Property operations | No automated response | Confirmed participant |
| Auto-reply/out-of-office | Log quietly as no signal | None unless repeated/long-term policy | No follow-up based solely on auto-reply | Message ID and classification |
| Resident asks a question while saying they will stay | Route human; do not close green | Renewal/property staff | Approved answer only | Human response record |
| Sarcasm, “k,” mixed intent, or low confidence | Route human with verbatim text | Property manager | No automated response | Human disposition |
| Non-English reply | Route to approved language-access process; do not rely on unreviewed translation for material decisions | Designated staff/vendor | Approved language support | Reviewed response and language used |
| Image or attachment-only reply | Preserve securely; create human-review task; malware scan where supported | Property manager | No automated interpretation-dependent response | Human review disposition |
| Accommodation/disability request | Sensitive flag, restricted route, policy deadline, additional approval if required | Designated compliance/property staff | No automatic response; approved response can be prepared | Human decision and communication record |
| Habitability or safety concern | High-priority route under client policy; link/create work item | Property manager/maintenance | No unsupported promises | Source task, actions, resident follow-up |
| Legal threat/formal complaint | Restricted alert and client legal/escalation policy | Designated leadership/legal contact | No automatic response | Human disposition |
| Discrimination concern | Restricted alert and compliance process | Designated leadership/compliance | No automatic response | Human disposition |
| Existing work order found | Link; do not duplicate automatically if match is clear | Current work owner | Approved acknowledgement only | Linked work-order status |
| Several possible work-order matches | Show candidates and require human selection | Maintenance coordinator | No automatic commitment | Human-selected link |
| Work order closed but resident says unresolved | Reopen retention issue; do not accept source status as resident confirmation | Property manager/maintenance | Approved acknowledgement/follow-up | New work activity and confirmation |
| Resident reports moving for external reason | Create early leasing handoff; do not pressure or classify as fixable grievance unless one exists | Leasing | Approved response only | Handoff acknowledgement |
| No reply after 90-day message | At 60 days, create approved follow-up opportunity if policy permits | Property manager | Message only after approval | Send or documented skip |
| No reply by 30-day handoff | Transfer internally; no soft check-in | Leasing | Existing formal process only | Accepted handoff |
| PMS API unavailable | Queue events, retry, then use reconciliation/export fallback; alert | System support | No action based on stale data | Restored sync and reconciled records |
| Email provider unavailable | Do not mark sent; retry with backoff; alert after threshold | System support/property ops | Delayed, never duplicated | Provider acceptance and case update |
| AI unavailable | Preserve resident reply; route human with “classification unavailable”; draft becomes manual | Property manager | No silent delay or auto-send | Human classification/draft or later retry |
| AI output violates schema/policy | Retry once, then visible manual-review state | Property manager | No message until approved | Corrected output or manual text |
| Internal chat unavailable | Create task in fallback system and alert through secondary channel | System support | No automatic resident impact | Delivery to fallback surface |
| Scheduled sweep fails silently | Independent stale-heartbeat alert | System support/on-call | Prevents long unnoticed gap | Successful rerun and reconciliation |
| Concurrent workflow runs | Database lock/uniqueness constraint permits one transition | Automatic | One action only | Unique event record |
| Employee changes data during approval | Fresh-state revalidation detects mismatch and pauses | Approver/data owner | No message on stale assumptions | Re-reviewed current state |
| Lease renews or resident moves before send | Cancel pending outreach and close case | Automatic with review for conflict | No inappropriate message | PMS source update and cancellation event |
| Case marked resolved without resident confirmation | Set resolution pending/unconfirmed, not fully closed | Property manager | Confirmation only after approval | Resident confirmation or documented closure rule |
| Data-retention deadline reached | Delete content under policy and log deletion evidence | Privacy/system administrator | None | Deletion job record |

### Escalation model

Escalation is configurable by client, property, category, and time of day. A typical model is:

1. assignment created for responsible property manager;
2. acknowledgement reminder if untouched within the normal SLA;
3. escalation to regional manager if still unacknowledged;
4. parallel compliance or emergency process for predefined sensitive categories; and
5. support escalation if the blocker is a system or integration failure.

Age alone should not invent urgency. A routine unanswered item can become overdue, but only the client's policy and the facts of the case determine whether it becomes an emergency.

### Keeping work visible

The system uses explicit operational states, not an unstructured activity log:

`SOURCE_PENDING` → `ELIGIBLE` → `DRAFT_PENDING` → `APPROVAL_PENDING` → `APPROVED` → `SEND_RESERVED` → `SENT` → `REPLY_RECEIVED` → `REVIEW_REQUIRED` or `POSITIVE_RECORDED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLUTION_PENDING_CONFIRMATION` → `RESOLVED_CONFIRMED` → `RENEWAL_HANDOFF` → `CYCLE_CLOSED`

Exception states can interrupt the flow:

`DATA_EXCEPTION`, `SOURCE_CONFLICT`, `POLICY_FAILED`, `DELIVERY_FAILED`, `UNMATCHED_REPLY`, `AI_UNAVAILABLE`, `COMPLIANCE_REVIEW`, `OVERDUE`, and `RESOLUTION_UNCONFIRMED`.

Every queue view should support filtering by property, portfolio, owner, status, age, urgency, sensitive flag, and lease window. Every item should show last activity and next expected action.

---

## 10. Complete production workflow map reference

This section is the direct specification for the Excalidraw map.

### A. Recommended diagram structure

Build the map left to right using six vertical phases and eight horizontal swimlanes.

#### Vertical phases

1. **Source and eligibility**
2. **Draft and approval**
3. **Resident delivery and reply**
4. **Triage and assignment**
5. **Resolution and confirmation**
6. **Renewal handoff, reporting, and continuous controls**

#### Horizontal swimlanes

1. **Resident**
2. **Property manager / site team**
3. **Regional, leasing, maintenance, and compliance teams**
4. **Existing business systems: PMS, maintenance, email, calendar/task, accounting/BI**
5. **Orchestration and fixed rules**
6. **AI drafting and classification**
7. **Operational database and audit**
8. **Monitoring, security, backup, and privacy controls**

### B. Visual legend

Use consistent shapes and colors:

- **Blue rounded rectangle:** existing business system
- **Dark neutral rectangle:** automation/orchestration process
- **Purple rectangle:** AI step
- **Yellow diamond:** decision
- **Green rounded rectangle:** successful completed state
- **Orange rectangle:** human action or approval
- **Red rectangle:** exception, refusal, or sensitive escalation
- **Grey cylinder:** operational database/audit store
- **Dashed arrow:** scheduled or reconciliation flow
- **Solid arrow:** event or action flow
- **Thick red boundary line:** no resident-facing send crosses without approval
- **Lock icon:** role-restricted or sensitive information
- **Eye icon:** visible in existing employee system
- **Circular arrow:** retry with backoff

### C. Actors

| ID | Actor | Responsibility |
|---|---|---|
| A01 | Resident | Receives approved email, replies normally, confirms or disputes resolution |
| A02 | Property manager | Reviews drafts and replies, approves communication, owns resident follow-up |
| A03 | Maintenance coordinator/technician/vendor process | Executes and updates repair work under existing procedures |
| A04 | Leasing/renewal specialist | Owns pricing, formal offers, notices, documents, and thirty-day handoff |
| A05 | Regional manager | Owns overdue work, property performance, and escalations |
| A06 | Compliance/legal designee | Reviews sensitive cases under client policy |
| A07 | Executive/operations leader | Reviews portfolio measures and pilot outcomes |
| A08 | System support/on-call | Responds to technical failures, stale heartbeats, and recovery events |

### D. Systems

| ID | System | Label for map | Key input | Key output |
|---|---|---|---|---|
| S01 | Property-management system | PMS: residents, units, leases, renewals | Staff-entered authoritative records | Lease/resident changes and renewal outcomes |
| S02 | Maintenance/work-order system | Maintenance: requests and completion | Work orders, assignments, vendor/staff updates | Context, progress, completion evidence |
| S03 | Email platform | Company mailbox | Approved outbound message; resident reply | Delivery status, bounce, reply |
| S04 | Collaboration/task platform | Employee action surface | Approval, exception, and assignment cards | Human decisions and task actions |
| S05 | Calendar/task manager | Follow-up scheduling | Owner and due date | Completion/reassignment |
| S06 | Integration gateway | API / webhook / secure-file adapter | Source events and exports | Normalized events and write-backs |
| S07 | Workflow orchestration | Background process manager | Events, schedules, rules, actions | Coordinated commands and state transitions |
| S08 | Operational database | Case state, consent, uniqueness | Normalized facts and events | Current state and controls |
| S09 | Audit store | Evidence trail | Approvals, exact text, sends, matches, changes | Searchable history and compliance evidence |
| S10 | AI drafting service | Draft assistant | Minimum context and policy | Structured draft |
| S11 | AI classification service | Reply interpreter | Cleaned reply text | Structured intent, concern, urgency, confidence |
| S12 | Policy/safety engine | Deterministic control layer | Facts, text, role, consent, state | Pass, refuse, escalate, reapprove |
| S13 | BI/reporting | Portfolio visibility | Aggregated case and outcome data | Dashboard and scheduled reports |
| S14 | Accounting data | Client turnover-cost inputs | Approved cost measures | Exposure methodology inputs |
| S15 | Monitoring/incident system | Health and failure control | Heartbeats, errors, latency, queue depth | Alerts and incidents |
| S16 | Identity/secrets service | Access and credentials | Roles, service identities, policies | Authentication, authorization, scoped secrets |
| S17 | Backup/retention service | Recovery and deletion | Approved data and policy | Backups, restores, deletion evidence |

### E. Primary inputs

| ID | Input | Source |
|---|---|---|
| I01 | Resident and lease record | PMS |
| I02 | Property, unit, and responsible team | PMS |
| I03 | Approved email and consent state | PMS/consent store |
| I04 | Work-order context | Maintenance system |
| I05 | Client message policy and brand voice | Approved configuration |
| I06 | Client escalation matrix and SLAs | Approved configuration |
| I07 | Resident reply | Email platform |
| I08 | Human approval/edit/assignment/resolution | Employee action surface |
| I09 | Renewal outcome | PMS |
| I10 | Turnover-cost assumptions | Accounting/BI |

### F. Primary outputs

| ID | Output | Destination |
|---|---|---|
| O01 | Data-quality exception | Property operations queue |
| O02 | 120-day watchlist item | Operations/PMS/reporting view |
| O03 | 90-day approval card | Property manager action surface |
| O04 | Approved check-in email | Resident via company mailbox |
| O05 | Structured reply record | Operational database |
| O06 | Human-review alert | Property manager/regional/compliance channel |
| O07 | Linked or created internal task | Maintenance/PMS/task system |
| O08 | Approved acknowledgement | Resident via company mailbox |
| O09 | Overdue escalation | Responsible manager chain |
| O10 | Approved resolution confirmation | Resident via company mailbox |
| O11 | 30-day renewal handoff | Leasing/PMS queue |
| O12 | Portfolio metrics and outcome report | BI/executive view |
| O13 | System incident | Support/on-call channel |
| O14 | Audit evidence | Restricted audit store |
| O15 | Deletion/retention evidence | Privacy/security administration |

### G. Decision points

Use the D01-D20 labels from Section 8. The most important diamonds to emphasize visually are:

- **D03:** Which lease window applies?
- **D04:** Is the resident eligible and contactable?
- **D05:** Does the AI draft pass fixed policy?
- **D06:** What does the manager decide?
- **D07:** Is final text and fresh state safe to send?
- **D09:** Can the reply be matched deterministically?
- **D11:** Is this an opt-out?
- **D12:** Is this a clean positive with no question or concern?
- **D13:** Is there a clearly related work item?
- **D15:** Has a human approved the exact reply?
- **D16:** Is assigned work overdue or stalled?
- **D19:** Did the resident confirm resolution?
- **D20:** At 60 days, is an approved follow-up appropriate?

### H. Mandatory human gates

Draw these as orange gates with thick red boundary lines:

| Gate | Position | Required person | What cannot cross automatically |
|---|---|---|---|
| H01 | Before initial check-in send | Authorized property employee | 90-day resident message |
| H02 | Before 60-day follow-up send | Authorized property employee | Non-response follow-up |
| H03 | After any question, concern, uncertainty, or leaving signal | Assigned employee | Operational disposition |
| H04 | Sensitive-category route | Compliance/legal/property designee under policy | Decision or resident response |
| H05 | Before acknowledgement/reply send | Authorized employee; additional reviewer if policy requires | Resident reply |
| H06 | Before resolution-confirmation send | Authorized employee | Confirmation request |
| H07 | Formal renewal process | Leasing/authorized management | Pricing, offer, notice, document, negotiation |
| H08 | Unmatched identity | Property operations | Linking a reply to a resident |

### I. Exception paths

Group red exception nodes into five visible queues:

1. **Data exceptions:** missing/invalid contact, ambiguous date, duplicate occupancy, source conflict.
2. **Communication exceptions:** policy failure, approval timeout, bounce, opt-out, delivery failure.
3. **Reply exceptions:** unmatched sender, low confidence, attachment-only, language support, sensitive category.
4. **Operational exceptions:** no owner, overdue task, conflicting work-order status, resolution unconfirmed, handoff not acknowledged.
5. **System exceptions:** PMS/email/AI/chat outage, failed workflow, stale heartbeat, backup/restore failure.

Each exception arrow must end in a named queue or person. No red path should terminate at “log.”

### J. Status model for the map

Place this beneath the main workflow as a state ribbon:

`SOURCE_PENDING` → `ELIGIBLE` → `DRAFT_PENDING` → `APPROVAL_PENDING` → `APPROVED` → `SEND_RESERVED` → `SENT` → `REPLY_RECEIVED` → `REVIEW_REQUIRED` / `POSITIVE_RECORDED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLUTION_PENDING_CONFIRMATION` → `RESOLVED_CONFIRMED` → `RENEWAL_HANDOFF` → `CYCLE_CLOSED`

Place exception badges above the ribbon:

`DATA_EXCEPTION` · `SOURCE_CONFLICT` · `POLICY_FAILED` · `DELIVERY_FAILED` · `UNMATCHED_REPLY` · `AI_UNAVAILABLE` · `COMPLIANCE_REVIEW` · `OVERDUE` · `RESOLUTION_UNCONFIRMED`

### K. Cross-cutting control band

Add a band across the bottom of the entire diagram for controls that apply to every phase:

- role-based access and multifactor authentication;
- least-privilege integrations and mailbox scopes;
- encrypted data in transit and at rest;
- client-dedicated environment;
- permanent cross-channel opt-out;
- state-transition and uniqueness controls;
- immutable approval and send evidence;
- fresh-state revalidation before action;
- retry with backoff and dead-letter queues;
- independent heartbeat monitoring;
- data minimization, retention, and deletion;
- encrypted backups and tested restore; and
- change management, versioned policies, and rollback.

### L. Top-line callouts for prospect meetings

Place four plain-language callouts above the diagram:

1. **The PMS still handles renewals. This system finds unresolved problems earlier.**
2. **Employees work in their existing inbox, PMS, maintenance queue, and team channel.**
3. **AI drafts and interprets. People approve, decide, and commit the company.**
4. **Every exception has an owner, and no resident-facing message sends automatically.**

### M. Simplified presenter path

For a prospect meeting, trace this eleven-step path through the map:

1. The PMS says a resident is approaching lease end.
2. The system validates the record and places the resident in a date-based window.
3. It checks existing work-order context and drafts a soft check-in.
4. The property manager receives the draft in an existing work tool.
5. The manager approves the exact text.
6. The resident receives an ordinary email from the company and replies normally.
7. The system matches the reply without asking AI to guess identity.
8. AI helps interpret the reply; fixed rules decide whether a person is required.
9. The responsible employee receives the resident's words, context, owner, and next action.
10. Work is completed in the company's existing systems, and any resident follow-up requires another approval.
11. The case hands back to the normal renewal process with a complete record and portfolio reporting.

### N. Prospect-facing summary

The production system is the connective tissue between the company's lease calendar, resident inbox, property teams, maintenance work, and renewal process. It does not replace those systems and it does not remove people from important decisions. It makes the recurring coordination happen on time, turns replies into owned work, keeps exceptions visible, and creates an evidence trail from first check-in to renewal outcome.

At scale, the business value comes from thousands of small administrative actions being completed consistently and from a smaller number of consequential resident concerns reaching the right person earlier. The result is a more controlled operation: less manual chasing, fewer silent misses, faster follow-up, clearer accountability, and more capacity for the team to manage growth without treating every additional property as an equal increase in administrative headcount.
