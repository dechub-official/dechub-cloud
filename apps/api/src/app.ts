import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';

import authRoutes from './core/auth/auth.routes';
import usersRoutes from './core/users/users.routes';
import orgRoutes from './core/org/org.routes';
import leadsRoutes from './products/crm/leads/leads.routes';
import activitiesRoutes from './products/crm/activities/activities.routes';
import tasksRoutes from './products/crm/tasks/tasks.routes';
import companiesRoutes from './products/crm/companies/companies.routes';
import pipelineRoutes from './products/crm/pipeline/pipeline.routes';
import dashboardRoutes from './products/crm/dashboard/dashboard.routes';
import importsRoutes from './products/crm/imports/imports.routes';
import inboundRoutes from './products/crm/inbound/inbound.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY_HOPS); // so req.ip is the real visitor, for rate limits and the audit log
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Uptime ping target. An uptime monitor calls this every 10 minutes so Render never sleeps.
  app.get('/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down', time: new Date().toISOString() });
  });

  // Website forms: called from other origins, authenticated by API key, not by session.
  const inboundOrigins = env.INBOUND_ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  app.use(
    '/api/v1/inbound',
    cors({ origin: inboundOrigins.includes('*') ? true : inboundOrigins, methods: ['POST'], allowedHeaders: ['Content-Type', 'x-api-key'] }),
    inboundRoutes,
  );

  // Everything else: the CRM web app (normally same-origin through the Next.js proxy).
  const v1 = express.Router();
  v1.use(cors({ origin: env.WEB_URL, credentials: true }));
  v1.use(apiLimiter);
  v1.use('/auth', authRoutes);
  v1.use(requireAuth);
  v1.use('/users', usersRoutes);
  v1.use('/org', orgRoutes);
  v1.use('/leads/:leadId/activities', activitiesRoutes);
  v1.use('/leads', leadsRoutes);
  v1.use('/tasks', tasksRoutes);
  v1.use('/companies', companiesRoutes);
  v1.use('/pipeline', pipelineRoutes);
  v1.use('/dashboard', dashboardRoutes);
  v1.use('/imports', importsRoutes);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
