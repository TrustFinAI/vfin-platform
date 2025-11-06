# Stage 1: Build the TypeScript server
# Use a specific Node.js version for consistency
FROM node:18-slim AS builder

# Set the working directory
WORKDIR /app

# Copy all project files
COPY . .

# Install dependencies and build the server code
# This compiles the TypeScript in server/ to JavaScript in dist/
RUN npm install
RUN npm run build

# Stage 2: Create the final production image
# Use a slim Node.js image for a smaller final size
FROM node:18-slim

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/dist ./dist

# Expose the port the server will listen on
EXPOSE 8080

# The command to start the server in production
CMD ["npm", "run", "start:prod"]
