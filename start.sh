#!/bin/bash
cd /home/z/my-project

# Ensure Prisma client is generated
npx prisma generate --no-hints 2>/dev/null

# Ensure database is in sync  
npx prisma db push --accept-data-loss 2>/dev/null

# Start the server using custom server.js
exec node server.js
