import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";
import { storage } from "../server/storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(`[express] ${logLine}`);
    }
  });

  next();
});

// Initialize the application
let initialized = false;
const initialize = async () => {
  if (initialized) return;
  
  try {
    // Load persisted data
    await storage.loadData();
    console.log("[storage] Loaded persisted data successfully");
  } catch (error: any) {
    console.log(`[storage] Failed to load persisted data: ${error.message || error}`);
  }

  await registerRoutes(app);
  
  // Handle errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  
  // Serve static files
  serveStatic(app);
  
  initialized = true;
};

// Initialize on first request
app.use(async (req, res, next) => {
  if (!initialized) {
    await initialize();
  }
  next();
});

export default app;