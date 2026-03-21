FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/packages/prisma
RUN pnpm exec prisma generate --schema=./schema
WORKDIR /app
EXPOSE 8888
CMD ["pnpm", "run", "dev", "--filter=web"]
