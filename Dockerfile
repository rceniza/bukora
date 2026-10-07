FROM node:22-bookworm-slim

COPY --from=oven/bun:1.3.10 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8081

CMD ["bun", "run", "web"]
