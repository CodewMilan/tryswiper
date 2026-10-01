# Observability

## Logs

Use structured JSON logs.

Every request should have:
- request_id
- workspace_id where appropriate
- user_id where appropriate
- operation
- duration
- result

Never log:
- OAuth tokens
- API keys
- full private user content unless explicitly required

## Metrics

Track:
- API latency
- error rate
- generation latency
- generation cost
- queue depth
- export latency
- publish success rate
- MCP tool latency
- active workspaces

## Tracing

Trace:
MCP request → API → generation → model provider → persistence.

## Alerts

Alert on:
- elevated API errors
- queue backlog
- publishing failures
- provider failures
- database errors
- abnormal cost spikes
