import { Router } from 'express';

/** Liveness and readiness probes for orchestrators. */
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  });

  return router;
}
