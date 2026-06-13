/** ecosystem.config.js — PM2 process manager config.
 *  Usage: pm2 start ecosystem.config.js
 *  Inside Docker, the API is managed by the container itself, but for bare-metal deploys,
 *  PM2 keeps the process alive and handles graceful restarts.
 *
 *  Per Agent Guide §F.6 (10k concurrent users), the job workers run in a SEPARATE
 *  process from the API so heavy background work doesn't starve API threads.
 */

module.exports = {
  apps: [
    {
      name: 'unify-api',
      script: './apps/api/dist/server.js',
      instances: process.env.PM2_INSTANCES || 4,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Skip job queue initialization in the API process (jobs run separately)
        SKIP_JOB_WORKERS: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        SKIP_JOB_WORKERS: 'true',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'unify-jobs',
      script: './apps/api/dist/jobs/standalone.js',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/jobs-error.log',
      out_file: './logs/jobs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
    },
    {
      name: 'unify-web',
      script: './apps/web/server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

