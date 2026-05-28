/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.bunny.net',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.squarecdn.com https://*.squareup.com https://*.squareupsandbox.com https://*.paypal.com https://*.paypalobjects.com https://apis.google.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.squarecdn.com https://*.squareup.com https://*.squareupsandbox.com https://*.paypal.com https://*.datadoghq.com; frame-src 'self' https://*.squarecdn.com https://*.squareup.com https://*.squareupsandbox.com https://*.paypal.com https://*.firebaseapp.com https://iframe.mediadelivery.net https://*.mediadelivery.net https://*.youtube.com https://*.vimeo.com https://*.wistia.com https://*.wistia.net; img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com https://*.squarecdn.com https://*.squareup.com https://*.squareupsandbox.com https://*.paypal.com https://*.paypalobjects.com https://*.b-cdn.net https://*.bunny.net; media-src 'self' blob: data: https://*.googleapis.com https://*.googleusercontent.com https://*.bunny.net https://*.b-cdn.net https://*.mediadelivery.net; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.squarecdn.com https://*.squareup.com;",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
