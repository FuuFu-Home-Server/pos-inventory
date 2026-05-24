FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache bash

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN bash scripts/use-pg-schema.sh && \
    npx prisma generate && \
    npm run build && \
    bash scripts/restore-sqlite-schema.sh

FROM base AS runner
ENV NODE_ENV=production
ENV IS_PROD_SERVER=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.postgresql.prisma ./prisma/schema.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
