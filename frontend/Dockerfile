# Stage 1: Build React/Vite application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Stage 2: Serve with Nginx Alpine
FROM nginx:stable-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
