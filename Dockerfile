FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/packages/prisma
RUN pnpm exec prisma generate --schema=./schema
WORKDIR /app
RUN pnpm run build --filter=@dub/utils --filter=@dub/prisma --filter=@dub/blocks --filter=@dub/ui --filter=@dub/email 2>/dev/null || true
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 8888
CMD ["pnpm", "run", "dev", "--filter=web"]
