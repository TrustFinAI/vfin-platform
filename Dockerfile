# ---- Build Stage ----
# This stage installs dependencies and compiles the TypeScript code into JavaScript.
FROM node:20-slim AS builder

# Set the working directory for the application
WORKDIR /app

# Copy only the necessary package files for the backend to leverage Docker cache
COPY server/package.json ./server/
# It's good practice to also copy the lock file if it exists
# COPY server/package-lock.json ./server/

# Set the working directory to the server folder to install its specific dependencies
WORKDIR /app/server
RUN npm install

# Copy the rest of the backend source code
WORKDIR /app
COPY server/ ./server/

# Run the build script defined in server/package.json to compile TypeScript
RUN npm run build --prefix server

# ---- Production Stage ----
# This stage creates the final, small, and secure image for running the application.
FROM node:20-slim

# Set the working directory for the application
WORKDIR /app

# Copy only the production node_modules from the 'builder' stage
COPY --from=builder /app/server/node_modules ./server/node_modules

# Copy the compiled JavaScript code from the 'builder' stage
COPY --from=builder /app/server/dist ./server/dist

# Copy the backend's package.json for context
COPY --from=builder /app/server/package.json ./server/

# Expose the port the application will run on (should match the PORT in your code)
EXPOSE 8080

# The command that starts the application
CMD [ "node", "server/dist/index.js" ]
