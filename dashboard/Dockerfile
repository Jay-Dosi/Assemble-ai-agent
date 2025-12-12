FROM node:20-bookworm AS base
WORKDIR /app

COPY package.json package-lock.json* tsconfig.json next.config.js next-env.d.ts ./
COPY app ./app
COPY public ./public
COPY styles ./styles 2>/dev/null || true

RUN npm install
RUN npm run build

FROM node:20-bookworm
WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json* /app/tsconfig.json /app/next.config.js /app/next-env.d.ts ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]

