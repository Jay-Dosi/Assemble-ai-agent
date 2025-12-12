import dotenv from 'dotenv';

dotenv.config();

export const config = {
  workspaceRoot: process.env.WORKSPACE_ROOT || process.cwd(),
  registryTimeoutMs: Number(process.env.REGISTRY_TIMEOUT_MS || 8000),
  sandboxImage: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
  sandboxWorkdir: process.env.SANDBOX_WORKDIR || '/workspace',
  projectCommand: process.env.PROJECT_TEST_CMD || 'npm test -- --runInBand',
  maxAttempts: Number(process.env.MAX_ATTEMPTS || 3),
  detectionIntervalMs: Number(process.env.DETECTION_INTERVAL_MS || 15 * 60 * 1000),
  oumiApiKey: process.env.OUMI_API_KEY || '',
  oumiModel: process.env.OUMI_MODEL || 'gpt-4o-mini',
  oumiBaseUrl:
    process.env.OUMI_BASE_URL ||
    'http://localhost:8000/v1/chat/completions',
  clineEndpoint:
    process.env.CLINE_ENDPOINT || 'http://localhost:3005/v1/mission',
  githubToken: process.env.GITHUB_TOKEN || '',
  repoFullName: process.env.REPO_FULL_NAME || '',
  dashboardOrigin: process.env.DASHBOARD_ORIGIN || 'http://localhost:3001',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  apiToken: process.env.API_TOKEN || '',
};

export type Config = typeof config;

