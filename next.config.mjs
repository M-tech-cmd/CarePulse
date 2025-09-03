import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Turbopack (Next.js new bundler)
  turbopack: {},
  reactStrictMode: true,
  // ❌ swcMinify is no longer needed in Next.js 15
};

export default withSentryConfig(
  nextConfig,
  {
    // Sentry Webpack plugin options (for source maps)
    org: "m-tech-cmd", // 🔹 your Sentry org slug
    project: "javascript-nextjs", // 🔹 your Sentry project slug
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: false,
    automaticVercelMonitors: true,
  },
  {
    // Additional build options (recommended by Sentry)
    hideSourceMaps: true,      // don’t serve .map files to users
    transpileClientSDK: true,  // improves Sentry SDK tree-shaking
  }
);
