FROM node:lts-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787 AS frontend-build
LABEL stage=frontend-build

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit
COPY frontend/ .
RUN npm run build


FROM node:lts-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787 AS backend-build
LABEL stage=backend-build

WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci --no-audit
COPY backend/ .
RUN npm run build


FROM node:lts-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787

LABEL maintainer="Tim Inovatori <donotreply@kuhari.app>"
LABEL description="Platforma kuhari je interaktivna platforma za povezivanje instruktora kuhanja s polaznicima njihovih programa"

WORKDIR /app

COPY --from=backend-build /build/backend/package*.json ./
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=frontend-build /build/frontend/dist ./public

RUN npm ci --no-audit --omit=dev

HEALTHCHECK --timeout=5s --start-period=5s CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/healthcheck || exit 1

USER node

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
