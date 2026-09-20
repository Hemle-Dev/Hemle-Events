FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SITE_URL=http://localhost:3000
ARG VITE_HEMLE_GOOGLE_FORM_URL
ARG VITE_HEMLE_WHATSAPP_URL
ARG VITE_HEMLE_EMAIL
ARG VITE_HEMLE_MAGAZINE_URL
ARG VITE_HEMLE_FACEBOOK_URL
ARG VITE_HEMLE_INSTAGRAM_URL
ARG VITE_HEMLE_LINKEDIN_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_HEMLE_GOOGLE_FORM_URL=$VITE_HEMLE_GOOGLE_FORM_URL
ENV VITE_HEMLE_WHATSAPP_URL=$VITE_HEMLE_WHATSAPP_URL
ENV VITE_HEMLE_EMAIL=$VITE_HEMLE_EMAIL
ENV VITE_HEMLE_MAGAZINE_URL=$VITE_HEMLE_MAGAZINE_URL
ENV VITE_HEMLE_FACEBOOK_URL=$VITE_HEMLE_FACEBOOK_URL
ENV VITE_HEMLE_INSTAGRAM_URL=$VITE_HEMLE_INSTAGRAM_URL
ENV VITE_HEMLE_LINKEDIN_URL=$VITE_HEMLE_LINKEDIN_URL
COPY . .
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
RUN chmod +x scripts/docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
