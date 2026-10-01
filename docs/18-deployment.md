# Deployment

## Environments

- local
- preview/staging
- production

## Web

Deploy Next.js separately from worker/API where useful.

## API and workers

Containerize.

Workers should scale independently because rendering and AI generation are CPU/time intensive.

## Database

Managed PostgreSQL with:
- automated backups
- migrations
- connection pooling
- monitoring

## Object storage

Store:
- logos
- uploaded images
- generated images
- rendered exports

Use signed URLs.

## CI

Every pull request:
1. install
2. lint
3. typecheck
4. unit tests
5. integration tests
6. build

Main branch:
7. deploy staging
8. E2E
9. production deployment with appropriate controls

## Configuration

Use environment variables for deployment configuration. Keep a `.env.example` checked into the repository.
