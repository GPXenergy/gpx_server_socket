function getApiUrl(): string {
  switch (process.env.NODE_ENV) {
    case 'prod':
      return 'https://dashboard.gpx.nl';
    default:
      return 'http://localhost:8000';
  }
}

function getRedisUrl(): string {
  switch (process.env.NODE_ENV) {
    case 'prod':
      // For nodejs scaling in the future
      return '';  // 'redis://dashboard.gpx.nl:6379';
    default:
      return '';  // 'redis://localhost:6379';
  }
}

export const environment = {
  redisUrl: getRedisUrl(),
  apiUrl: getApiUrl(),
  ioPort: process.env.NODE_PORT || 3000,
  apiKey: process.env.API_KEY || 'testing',
};
