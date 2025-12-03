/**
 * Health Check Script for Docker Container
 * Used by Docker HEALTHCHECK instruction
 *
 * This script checks if the application is responding correctly
 * by making an HTTP request to the /health endpoint.
 *
 * Exit codes:
 * 0 - Healthy (200 status code)
 * 1 - Unhealthy (non-200 status code or error)
 */

const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 3000, // 3 second timeout
  method: 'GET',
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);

  if (res.statusCode === 200) {
    // Collect response body
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Health check response:', data);

        // Verify health status
        if (data.status === 'healthy') {
          console.log('✓ Application is healthy');
          process.exit(0); // Success
        } else {
          console.error('✗ Application reports unhealthy:', data);
          process.exit(1); // Failure
        }
      } catch (error) {
        console.error('✗ Failed to parse health check response:', error.message);
        process.exit(1); // Failure
      }
    });
  } else {
    console.error(`✗ Health check failed with status code: ${res.statusCode}`);
    process.exit(1); // Failure
  }
});

request.on('error', (error) => {
  console.error('✗ Health check request failed:', error.message);
  process.exit(1); // Failure
});

request.on('timeout', () => {
  console.error('✗ Health check request timed out');
  request.destroy();
  process.exit(1); // Failure
});

request.end();
