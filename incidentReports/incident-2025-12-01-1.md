# Incident: YYYY-MM-DD HH-mm-ss

## Summary

> [!NOTE]
> Between the hour of 02:04 and 02:44 on Dec 1, 2 users encountered 500 error when ordering pizza. The event was triggered by a error from the pizza factory server at 2pm ish. The error from the pizza factory are from unknown reason and was out of our controls.

A bug in this code caused 500 error when ordering pizza. The event was detected by failing requests alert on Grafana. The team started working on the event by following the pizza playbook . This severe incident affected 100% of users.

There was further impact as noted by 2 support tickets were raised in relation to this incident.

## Detection

> [!NOTE]
> This incident was detected when the failing requests was triggered and pizza devops were paged.

Next, pizza factory devops team was paged, because pizza devops didn't own the service writing to the disk, delaying the response by 10 minutes.

We will add explicit ownership metadata to Grafana alerts and configure automatic paging to the Pizza Factory on-call (so alerts that indicate the disk-writing service will page the owning team directly). We will also update the pizza playbook with the cross-team escalation path and run a tabletop to validate the flow.

This improvement will be implemented by the Platform Reliability team in collaboration with Pizza DevOps and Pizza Factory DevOps, targeted completion: 2025-12-10, so that cross-team handoffs are automatic and the mean response time for paging the correct owner is reduced from ~10 minutes to <2 minutes.

## Impact

> [!NOTE]
> For 2:04pm between 2:45pm on Dec 1, 2 of our users experienced this incident.

This incident affected all customers, who experienced 500 error when ordering pizza.

2 tickets were submitted.

## Timeline

> [!NOTE]
> Detail the incident timeline. We recommend using UTC to standardize for timezones.
>
> All times are UTC.

- _02:04_ - User reports of 500 errors start coming in when ordering pizza
- _02:04_ - Alert triggered for failing requests on Grafana
- _02:14_ - Pizza DevOps team paged
- _02:24_ - Pizza Factory DevOps team paged
- _02:34_ - Incident identified, pizza factory server investigation started
- _02:44_ - Pushed fix to resolve 500 errors
- _02:47_ - Monitoring shows errors resolved , users able to order pizza again with 200
- _02:50_ - Incident declared resolved

## Response

> [!NOTE]
> After receiving a page at 02:04 UTC, pizza devops oncall engineer came online at 02:14 UTC in PagerDuty.
> The engineer review the error logs and found out that the factory server is returning 500 errors.
> The engineer then paged pizza factory oncall engineer at 02:24 UTC who came online at 02:34 UTC.
> The pizza factory engineer investigated and solved the issue at 02:44 UTC.

## Root cause

> [!NOTE]
> The factory server was down and therefore returning 500 errors when pizza orders were sent to it.

## Resolution

The Pizza Factory on-call engineer restarted the stuck order-processing service and flushed the queue of failed jobs at 02:44 UTC. After the service restart, we replayed the two failed customer orders and confirmed they completed with 200 responses. Grafana error and latency panels returned to baseline by 02:47 UTC, so we declared the incident resolved at 02:50 UTC. To cut time to mitigation next time, Pizza DevOps will page Pizza Factory directly as soon as the factory-owned alerts fire, eliminating the 10-minute handoff delay.

## Prevention

This same “factory server down” failure mode was seen in incidents HOT-22017 (Jul 12) and HOT-23001 (Sep 03), where the service exhausted disk space and crashed. Mitigations back then were limited to manual restarts, which is why the issue resurfaced. We need automated health checks plus resource alerting so outages are detected and remediated before customers are impacted.

## Action items

1. Platform Reliability – add ownership metadata to Grafana alerts and auto-page Pizza Factory on-call (JIRA REL-142, due 2025-12-10).
2. Pizza Factory DevOps – add liveness/readiness probes and automatic process restarts for the order-processing service (JIRA PFD-301, due 2025-12-05).
3. Pizza DevOps – schedule a joint tabletop exercise to rehearse the updated playbook and cross-team escalation (JIRA PIZ-559, due 2025-12-15).
