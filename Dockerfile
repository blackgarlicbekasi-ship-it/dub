FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ENV NODE_OPTIONS=--max-old-space-size=6144
ENV NEXT_TELEMETRY_DISABLED=1
ENV STRIPE_SECRET_KEY=sk_test_placeholder
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_placeholder
ENV NEXT_PUBLIC_APP_DOMAIN=159.65.146.107:8888
ENV NEXT_PUBLIC_APP_SHORT_DOMAIN=159.65.146.107:8888
ENV TINYBIRD_API_KEY=placeholder
ENV TINYBIRD_API_URL=https://api.tinybird.co
ENV PROJECT_ID_VERCEL=placeholder
ENV TEAM_ID_VERCEL=placeholder
ENV AUTH_BEARER_TOKEN=placeholder
ENV UPSTASH_REDIS_REST_URL=https://kind-bonefish-79222.upstash.io
ENV UPSTASH_REDIS_REST_TOKEN=gQAAAAAAATV2AAIncDJkY2ViZmU2MGUxZmM0ZjExYjk5YzYwM2QzYmQ2OGQ2YXAyNzkyMjI
ENV QSTASH_TOKEN=eyJVc2VySUQiOiI1YzlkYzAwNS03NjA0LTQwOTYtOWEzZi1kNTQzNjdlOTc1NTciLCJQYXNzd29yZCI6Ijc4Y2VkNDg3YzA4YTRlNmJiNmQyM2UzNDMzMThhZWQxIn0=
ENV QSTASH_CURRENT_SIGNING_KEY=sig_6QLVXEXgioe2mhbf3cxEGj9tzjJC
ENV QSTASH_NEXT_SIGNING_KEY=sig_6jWNwy9dBxh4urtiaASv5HwTpqUT
ENV DATABASE_URL=mysql://dub:DubPass2026@10.0.0.1:3306/dub_self_host
ENV PLANETSCALE_DATABASE_URL=http://dubsim:unused@10.0.0.1:3900/dub_self_host
ENV NEXTAUTH_SECRET=ganti1ni4d3ng4nR4nd0mStr1ng32ch
ENV NEXTAUTH_URL=http://159.65.146.107:8888
ENV RESEND_API_KEY=placeholder
WORKDIR /app/packages/prisma
RUN pnpm exec prisma generate --schema=./schema
WORKDIR /app
RUN pnpm run build --filter=@dub/utils --filter=@dub/prisma --filter=@dub/blocks --filter=@dub/ui --filter=@dub/email 2>/dev/null || true
RUN pnpm run build --filter=web; exit 0
EXPOSE 8888
WORKDIR /app/apps/web
CMD if [ -d ".next" ]; then pnpm start; else pnpm run dev --port 8888; fi
