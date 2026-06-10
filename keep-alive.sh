#!/bin/bash
# LAXREE Server Keep-Alive Script
cd /home/z/my-project

# Kill any existing server
pkill -f "node server.js" 2>/dev/null
sleep 1

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

# Start the server - restart if it dies
while true; do
  echo "[$(date)] Starting LAXREE server..."
  node --max-old-space-size=4096 server.js
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3 seconds..."
  sleep 3
done
