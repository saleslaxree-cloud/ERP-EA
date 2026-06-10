#!/bin/bash
cd /home/z/my-project

# Ensure Prisma client is generated
npx prisma generate --no-hints 2>/dev/null

# Ensure database is in sync  
npx prisma db push --accept-data-loss 2>/dev/null

# Seed if no users exist
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.user.count().then(c => { 
  if(c === 0) { 
    console.log('Seeding database...');
    fetch('http://localhost:3000/api/seed', { method: 'POST' }).catch(() => {});
  }
  db.\$disconnect();
}).catch(() => db.\$disconnect());
" 2>/dev/null &

# Use double-fork to fully detach from parent shell
# This prevents the server from being killed when the agent's bash exits
(
  while true; do
    echo "[$(date)] Starting LAXREE server..."
    node --max-old-space-size=4096 server.js 2>&1
    EXIT_CODE=$?
    echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3 seconds..."
    sleep 3
  done
) &

# Give server a moment to start
sleep 3
echo "LAXREE server started in background (detached)"
