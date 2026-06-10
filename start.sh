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

# Start the server using custom server.js with increased memory
exec node --max-old-space-size=4096 server.js
