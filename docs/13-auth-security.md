# Authentication and Security

## Authentication

Use secure session-based authentication or a reputable managed auth provider.

## Authorization

Every resource access must verify workspace membership.

Never trust workspace IDs supplied by the client without authorization checks.

## MCP authentication

Use short-lived scoped credentials where possible.

Scopes:
- project:read
- project:write
- carousel:read
- carousel:write
- brand:read
- asset:write
- export:write
- publish:write

Publishing should require a separate explicit permission.

## Secrets

Store:
- AI API keys
- OAuth credentials
- billing provider secrets

in a secrets manager/environment configuration.

Never store secrets in carousel JSON, logs, analytics or MCP responses.

## User-generated content

Treat all generated/imported content as untrusted input.

Sanitize HTML/SVG and validate uploaded files.

## Rate limiting

Apply rate limits by:
- user
- workspace
- MCP token
- IP
- expensive operation

## Audit log

Record sensitive actions:
- login
- credential connection
- publish
- delete
- permission change
- API token creation
