// Logger Usage Patterns

// Basic Usage
import { logger } from '@vendin/utils/logger';

logger.info('Operation completed');
logger.error({ error }, 'Operation failed');

// Custom Logger Instance
import { createLogger } from '@vendin/utils/logger';

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

// Structured Logging (Good)
logger.info({ tenantId, userId, duration: 1234 }, 'Tenant provisioned');
logger.error({ error, tenantId, operation: 'provision' }, 'Provisioning failed');

// Avoid (Bad)
logger.info('Tenant provisioned');
logger.error('Provisioning failed');
