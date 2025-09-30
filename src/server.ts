import express from 'express';

const app = express();

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, msg: 'api funcionando (PING-ONLY)' });
});

app.get('/', (_req, res) => {
  res.send('ROOT OK');
});

// Loguear rutas registradas
function listRoutes() {
  const routes: string[] = [];
  // @ts-ignore
  app._router.stack.forEach((m: any) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods)
        .filter(k => m.route.methods[k])
        .map(k => k.toUpperCase())
        .join(',');
      routes.push(`${methods} ${m.route.path}`);
    }
  });
  console.log('Rutas registradas:');
  routes.forEach(r => console.log('  -', r));
}

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`PING-ONLY SERVER on http://localhost:${PORT}`);
  listRoutes();
});
