FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --prod=false --frozen-lockfile=false

COPY . .
RUN pnpm build

EXPOSE 80

CMD ["pnpm", "preview"]
