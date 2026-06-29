# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8083
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8083
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8083/ || exit 1
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8083"]
