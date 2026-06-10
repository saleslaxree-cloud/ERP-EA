#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_V0CoL3SDNcKm@ep-noisy-bonus-app8563v.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://neondb_owner:npg_V0CoL3SDNcKm@ep-noisy-bonus-app8563v.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
exec node --max-old-space-size=4096 server.js
