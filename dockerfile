# Use the official Bun image
FROM oven/bun:1.0

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if exists) first for better caching
COPY package.json ./
COPY bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY ./*.ts .

COPY ./data/example.json ./data/

# Default command - run the discount calculator
CMD ["bun", "run", "index.ts", "./data/example.json"]