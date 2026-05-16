const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    headless: true
  },
  webServer: {
    command: 'python3 webapp/start_server.py',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
