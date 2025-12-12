FROM node:20-bookworm AS base
WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src

RUN npm install
RUN npm run build

FROM node:20-bookworm
WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json* /app/tsconfig.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "dist/index.js"]

