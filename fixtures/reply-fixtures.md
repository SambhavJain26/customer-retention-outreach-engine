# Reply Fixtures

Fixture 2 is the primary live-demo reply. Fixture 7 is the compliance-sensitive live-demo reply.

## 1. green-baseline

All good here, we're planning to stay. Thanks for checking in.

Expected: {"intent":"STAYING","grievance_category":"NONE","urgency":"LOW","compliance_flag":"NONE","confidence":"HIGH","requires_human":false,"contains_question":false}

## 2. maintenance-grievance-demo

We're happy here but the extractor fan in the bathroom has been broken since summer and I've reported it twice.

Expected: {"intent":"GRIEVANCE","grievance_category":"MAINTENANCE","urgency":"HIGH","compliance_flag":"NONE","confidence":"HIGH","requires_human":true,"summary_must_include":["extractor fan","reported it twice"]}

## 3. leaving

Thanks - we'll actually be relocating to Denver in the spring for my husband's job.

Expected: {"intent":"LEAVING","grievance_category":"NONE","urgency":"HIGH","compliance_flag":"NONE","confidence":"HIGH","requires_human":true}

## 4. wavering-rent

Depends what happens with the rent honestly. We like the place.

Expected: {"intent":"WAVERING","grievance_category":"NONE","urgency":"MEDIUM","compliance_flag":"NONE","confidence":"MEDIUM","requires_human":true}

## 5. neighbour-parking

the parking situation is ridiculous, someone in 2C has been taking my spot for months and nobody does anything

Expected: {"intent":"GRIEVANCE","grievance_category":"NEIGHBOURS","urgency":"HIGH","compliance_flag":"NONE","confidence":"HIGH","requires_human":true}

## 6. habitability

there's black mould coming through the bathroom ceiling again, third time this year

Expected: {"intent":"GRIEVANCE","grievance_category":"PROPERTY_CONDITION","urgency":"HIGH","compliance_flag":"HABITABILITY","confidence":"HIGH","requires_human":true,"no_auto_reply":true}

## 7. accommodation-request

My mother moved in with me and she uses a walker - is it possible to get a grab bar put in the bathroom?

Expected: {"intent":"GRIEVANCE","grievance_category":"PROPERTY_CONDITION","urgency":"HIGH","compliance_flag":"ACCOMMODATION_REQUEST","confidence":"HIGH","requires_human":true,"no_auto_reply":true,"contains_question":true}

## 8. auto-reply

I am out of the office until 14 August with limited access to email.

Expected: {"intent":"NO_SIGNAL","grievance_category":"NONE","urgency":"LOW","compliance_flag":"NONE","confidence":"HIGH","requires_human":false,"no_alert":true,"no_token_spend":true}

## 9. opt-out

stop emailing me

Expected: {"intent":"OPT_OUT","grievance_category":"NONE","urgency":"HIGH","compliance_flag":"OPT_OUT","confidence":"HIGH","requires_human":true,"opted_out":true}

## 10. unclear-low-confidence

k

Expected: {"intent":"UNCLEAR","grievance_category":"NONE","urgency":"LOW","compliance_flag":"NONE","confidence":"LOW","requires_human":true}

## 11. staying-with-question

We'd love to stay another year - what are the terms going to look like?

Expected: {"intent":"STAYING","grievance_category":"NONE","urgency":"MEDIUM","compliance_flag":"NONE","confidence":"HIGH","requires_human":true,"contains_question":true}
