/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: function(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });
    return config;
  },

  // Erlaube direkten Zugriff auf Dateien im Verzeichnis "uploads"
  async headers() {
    return [
      {
        // Gültig für alle Dateien im uploads-Verzeichnis
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Erlaubt Zugriff von allen Domains
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Setze höhere Timeout-Werte für langsamere Verbindungen
  serverRuntimeConfig: {
    staticPageGenerationTimeout: 120,
  },
  
  // Deaktiviere strict mode für Entwicklung
  reactStrictMode: false,
};

module.exports = nextConfig;
