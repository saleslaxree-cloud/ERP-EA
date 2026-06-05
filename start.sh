#!/bin/bash
cd /home/z/my-project

# Ensure Prisma client is generated
npx prisma generate --no-hints 2>/dev/null

# Build if not already built
if [ ! -d ".next/standalone" ]; then
  npx next build 2>/dev/null
fi

# Start the production server (more stable than dev)
exec npx next start -p 3000 -H 0.0.0.0
