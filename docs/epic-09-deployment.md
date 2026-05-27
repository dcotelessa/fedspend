# Epic 9 — Render Deployment

## Goal

Deploy the full stack to Render — backend as Web Service, frontend as Static Site, Postgres database.

## render.yaml

```yaml
services:
  - type: web
    name: fedspend-api
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && node dist/main
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: fedspend-db
          property: connectionString
      - key: FRONTEND_URL
        sync: false

  - type: static
    name: fedspend-ui
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist/frontend/browser
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

databases:
  - name: fedspend-db
    plan: free
```

## Backend Considerations

- TypeORM `migrationsRun: true` when `NODE_ENV=production`
- Generate initial migration: `npx typeorm migration:generate -n Init`
- CORS: `FRONTEND_URL` set to the static site URL on Render
- Health endpoint `/health` used by Render for uptime monitoring

## Frontend Considerations

- `environment.prod.ts` sets `apiUrl` to empty string (same origin)
- Need to configure API proxy or use full backend URL
- Actually: since backend is a separate service, `apiUrl` should be the full Render backend URL
- `_redirects` file in Angular output for SPA routing
- Build output: `frontend/dist/frontend/browser`

## Deployment Steps

1. Push repo to GitHub
2. Connect Render to repo
3. `render.yaml` auto-detects services
4. Backend builds and starts, migrations run
5. Frontend builds and deploys as static site
6. Trigger first sync via `POST /sync`

## Post-Deployment

- Verify `/health` responds
- Run `POST /sync` to populate database
- Verify all API endpoints return data
- Verify frontend loads and renders views

## Acceptance Criteria

- [ ] Backend deployed and healthy on Render
- [ ] Frontend deployed as static site
- [ ] Postgres database provisioned and connected
- [ ] Migrations run automatically
- [ ] First sync completes successfully
- [ ] All views render with production data
