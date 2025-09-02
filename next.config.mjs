import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
// The 'experimental.turbo' property is deprecated.
// Move this configuration to the top-level 'turbopack' property.
turbopack: {
// This empty object is used to enable Turbopack.
// You can add more configurations here if needed.
},
};

export default withSentryConfig(nextConfig, {
// Sentry configuration options
org: "m-tech-cmd",
project: "javascript-nextjs",
silent: !process.env.CI,
widenClientFileUpload: true,
// This line had a syntax error with a trailing comma.
// We've fixed it and set it to a valid boolean value.
disableLogger: false,
automaticVercelMonitors: true,
});