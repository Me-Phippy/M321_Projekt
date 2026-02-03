@echo off
echo Starting Docker Container...
docker-compose -f C:\Users\phill\Desktop\Module\M231\edu-pixelboard-disabled-game-rules\docker-compose.yml up -d

echo Setting environment for Docker API...
set API_URL=http://localhost:5085
set NEXT_PUBLIC_API_URL=http://localhost:3000

echo Starting Next.js in development mode...
next dev
:: docker-compose -f C:\Users\phill\Desktop\Module\M231\edu-pixelboard-no-auth\docker-compose.yml up -d