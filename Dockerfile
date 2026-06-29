# Stage 1: Build the React frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Run the Express backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy the compiled static assets from the builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose port and configure startup command
ENV PORT=3001
EXPOSE 3001

CMD ["node", "backend/server.js"]
