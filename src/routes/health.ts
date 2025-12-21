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
  const requestId = _req.headers['x-request-id'] as string || 'health-check';
  const timestamp = new Date().toISOString();
  console.log(`[HEALTH] GET /health received (request_id: ${requestId}, timestamp: ${timestamp})`);
  const responseData = { status: 'ok', timestamp, request_id: requestId };
  console.log(`[HEALTH] GET /health response: 200 OK (service_healthy: true)`);
  res.json(responseData);
}

export { healthRoute };
