import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { Server as SocketIOServer } from "socket.io";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "development" 
        ? ["http://localhost:3000", "http://localhost:5173"]
        : true,
      credentials: true
    },
    path: "/socket.io/"
  });
  
  // Make io available globally for job processor
  (global as any).io = io;
  
  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
  
  // Health check endpoint - always responds if server is alive
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    });
  });

  // File upload endpoint for CRM Sync (bypasses tRPC for large files)
  // MUST be registered BEFORE body parser to avoid 50MB limit
  const { handleFileUpload } = await import("./fileUploadEndpoint.js");
  app.post("/api/upload/file", handleFileUpload);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // REST API for external integrations
  const apiRouter = await import("../apiRouter.js");
  app.use("/api", apiRouter.default);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Add error handler for server
  server.on('error', (error: any) => {
    console.error('[Server] Error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use`);
      process.exit(1);
    }
  });

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`[Health] Health check available at http://localhost:${port}/api/health`);
    
    // Start job queue processor with error handling
    try {
      const { startJobQueue } = await import("../jobProcessor.js");
      startJobQueue();
      console.log("[JobQueue] Background job processor started");
    } catch (error) {
      console.error("[JobQueue] Failed to start job processor:", error);
      // Continue without job processor rather than crashing
    }

    // Start CRM merge worker
    try {
      const { crmMergeWorker } = await import("../queue/CRMMergeWorker.js");
      console.log("[CRMMergeWorker] CRM merge worker started");
    } catch (error) {
      console.warn("[CRMMergeWorker] Failed to start CRM merge worker:", error);
    }

    // Start connection pool metrics collection
    try {
      const { startConnectionPoolMetricsCollection } = await import("./connectionPoolMetrics.js");
      startConnectionPoolMetricsCollection(15000); // Collect every 15 seconds
      console.log("[Monitoring] Connection pool metrics collection started");
    } catch (error) {
      console.warn("[Monitoring] Failed to start connection pool metrics:", error);
    }
  });
}

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  console.error('[FATAL] Stack:', error.stack);
  // Don't exit - try to keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Promise Rejection at:', promise);
  console.error('[ERROR] Reason:', reason);
  // Don't exit - try to keep server running
});

startServer().catch((error) => {
  console.error('[FATAL] Server startup failed:', error);
  process.exit(1);
});
