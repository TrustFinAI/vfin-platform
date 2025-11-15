# ---- Build Stage ----
# This stage installs dependencies and compiles the TypeScript code.
FROM node:20-slim AS builder
WORKDIR /app

# Copy backend package files
COPY server/package.json server/package-lock.json* ./server/

# Install all backend dependencies (including devDependencies for build)
WORKDIR /app/server
RUN npm install

# Copy backend source code
WORKDIR /app
COPY server/ ./server/

# Build the TypeScript code into JavaScript
RUN npm run build --prefix server

# Prune development dependencies to keep the final image small
WORKDIR /app/server
RUN npm prune --production


# ---- Production Stage ----
# This stage creates the final, small, and secure image for running the application.
FROM node:20-slim
WORKDIR /app

# Copy only the necessary production artifacts from the builder stage
COPY --from-builder /app/server/node_modules ./server/node_modules
COPY --from-builder /app/server/dist ./server/dist
COPY --from-builder /app/server/package.json ./server/

# Expose the port the app runs on (should match the PORT in the code)
EXPOSE 8080

# The command that starts the application
CMD [ "node", "server/dist/index.js" ]
