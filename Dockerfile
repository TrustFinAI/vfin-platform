# Stage 1: Build the TypeScript code
FROM node:18-slim AS builder
WORKDIR /app

# Copy all necessary files
COPY package.json ./
COPY server/tsconfig.json ./server/tsconfig.json
COPY server/index.ts ./server/index.ts

# Install dependencies and build the server
RUN npm install
RUN npm run build

# Stage 2: Create the final production image
FROM node:18-slim
WORKDIR /app

# Copy only production dependencies from the builder stage
COPY --from=builder /app/package.json ./package.json
RUN npm install --omit=dev

# Copy the compiled JavaScript code from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 8080

# The command to start the server in production
CMD ["npm", "run", "start:prod"]
