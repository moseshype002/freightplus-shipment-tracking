import { Router, Request, Response } from 'express';
import { Database } from '../db/fileDb.js';

const router = Router();

// GET /api/stats
router.get('/', (_req: Request, res: Response): void => {
  try {
    const stats = Database.getStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve shipment statistics.' });
  }
});

export default router;
