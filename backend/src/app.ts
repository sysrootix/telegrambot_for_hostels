import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZodError } from 'zod';

import routes from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/api', routes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: err.flatten()
      });
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
