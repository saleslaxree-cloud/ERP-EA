#!/bin/bash
cd /home/z/my-project

# Ensure Prisma client is generated
npx prisma generate --no-hints 2>/dev/null

# Start the dev server
exec npx next dev -p 3000 -H 0.0.0.0
