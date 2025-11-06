# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and install dependencies
# Copying this first leverages Docker layer caching
COPY package.json ./
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Build the TypeScript server code into JavaScript
RUN npm run build

# Make port 8080 available to the world outside this container
# Cloud Run will automatically use this port
EXPOSE 8080

# Define the command to run the app
CMD ["npm", "run", "start:prod"]
