FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the dev server port
EXPOSE 5173

# Start dev server with host flag to allow external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
