import type { NextConfig } from "next";
const config: NextConfig = {
  // The Docker build sets NEXT_OUTPUT=standalone for a minimal server.js image;
  // local `npm start` and the Playwright suite keep the default output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // process.cwd()-based paths make the tracer copy whole folders; keep docs
  // and test fixtures out of the production bundle.
  outputFileTracingExcludes: { "/*": ["docs/**", "tests/**"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default config;
