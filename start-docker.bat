@echo off
echo Starting Docker Container...
docker-compose -f C:\Users\phill\Desktop\Module\M231\edu-pixelboard-disabled-game-rules\docker-compose.yml up -d

echo Setting environment for Docker API (Localhost)...
set API_URL=http://localhost:5085
set KEYCLOAK_ID=student_client
set KEYCLOAK_SECRET=cilK656iyLyMuKParWTygx3FmK3q3HAI
set KEYCLOAK_ISSUER=http://localhost:18080/realms/pixelboard-test
set NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:18080/realms/pixelboard-test
set NEXTAUTH_URL=http://localhost:3000

echo Starting Next.js with local Docker backend...
next dev