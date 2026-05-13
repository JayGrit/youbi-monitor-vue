# monitor-vue

Vue 3 / Vite frontend for the YouBi video generation monitor.

## Run

```bash
npm install
npm run dev
```

Default dev port: `8300`.

The dev server serves the app under `/monitor/` and proxies `/monitor/api`
to `http://127.0.0.1:8200/api`.

## Docker

```bash
docker build -t monitor-vue:local .
docker run --rm -p 8082:8082 monitor-vue:local
```

The nginx image serves the built SPA and proxies `/api` and `/health` to
`http://127.0.0.1:8200` under the `/monitor/` public path, matching the
host-network deployment workflow.
