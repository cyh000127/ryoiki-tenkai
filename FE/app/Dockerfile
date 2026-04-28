FROM node:22-alpine

WORKDIR /app
ARG VITE_ENABLE_DEBUG_FALLBACK=false
ENV VITE_ENABLE_DEBUG_FALLBACK=${VITE_ENABLE_DEBUG_FALLBACK}

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --prod=false --frozen-lockfile=false

COPY . .
RUN pnpm build

EXPOSE 80

CMD ["pnpm", "preview"]
