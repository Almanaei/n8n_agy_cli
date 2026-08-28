// ecosystem.config.js - PM2 Production Process Manager Configuration

module.exports = {
  apps: [
    {
      name: "civildefense-server",
      script: "./server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/server-error.log",
      out_file: "./logs/server-out.log",
      merge_logs: true
    },
    {
      name: "civildefense-n8n",
      script: "./scratch/run_n8n_process.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: "production",
        N8N_PORT: 5678
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/n8n-error.log",
      out_file: "./logs/n8n-out.log",
      merge_logs: true
    },
    {
      name: "civildefense-tunnel",
      script: "./cloudflared_manager.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      exp_backoff_restart_delay: 500,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/tunnel-error.log",
      out_file: "./logs/tunnel-out.log",
      merge_logs: true
    }
  ]
};
