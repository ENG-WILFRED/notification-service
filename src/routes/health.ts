import { Request, Response } from 'express';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
async function healthRoute(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export { healthRoute };
