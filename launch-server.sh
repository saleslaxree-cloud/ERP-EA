#!/bin/bash
cd /home/z/my-project
exec node --max-old-space-size=4096 server.js
