---
Task ID: 1
Agent: Main Agent
Task: Fix white screen issue in LAXREE Enterprise Operating System

Work Log:
- Diagnosed Turbopack panic error caused by /home/z/my-project/examples directory permission issues during CSS compilation
- Found that Turbopack was trying to watch the examples directory and failing with "Permission denied (os error 13)"
- Fixed next.config.ts to add webpack config with watchOptions to exclude examples/ and skills/ directories
- Changed dev script from `next dev` to `next dev --webpack` to avoid Turbopack bugs
- Changed build script from `next build` to `next build --webpack` for consistency
- Fixed lib/db.ts to always reuse PrismaClient instance (was only reusing in dev mode, creating new instances in production causing connection pool exhaustion)
- Removed `output: "standalone"` from next.config.ts since we use custom server.js
- Added `--max-old-space-size=4096` to Node.js start command to prevent OOM during SSR
- Updated start.sh and keep-alive.sh with memory flag
- Successfully built and tested the application - all pages and APIs return HTTP 200
- Verified: Login page renders, CSS loads, JS chunks load, Users API returns 21 users, Dashboard API returns data, Auth API works

Stage Summary:
- Root cause: Turbopack CSS parser panicking on examples/ directory (permission denied) caused 500 errors
- Secondary cause: PrismaClient not being reused in production mode, causing connection exhaustion
- Fix: Switch to webpack mode, exclude problematic directories, fix PrismaClient singleton, increase Node memory
- Application now builds and serves correctly on port 3000
