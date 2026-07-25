import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:10800',
        headless: true,
        screenshot: 'only-on-failure',
    },
    webServer: [
        {
            command: 'uv run python -m alexa_mcp --http --port 10801',
            port: 10801,
            cwd: '../',
            timeout: 30000,
            reuseExistingServer: true,
        },
        {
            command: 'npx vite --port 10800 --host 127.0.0.1',
            port: 10800,
            cwd: '.',
            timeout: 30000,
            reuseExistingServer: true,
        },
    ],
});
