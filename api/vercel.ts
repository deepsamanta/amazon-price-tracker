
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';
import bodyParser from 'body-parser';
import cors from 'cors';

// Create a standalone express app for the API routes
const app = express();

// Apply middleware
app.use(cors());
app.use(bodyParser.json());

// Apply routes
registerRoutes(app);

// This is the entry point for Vercel serverless functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[vercel] Handling ${req.method} request to ${req.url}`);
  
  return new Promise((resolve) => {
    // Create Express-compatible request and response objects
    const expressReq = Object.assign(req, {
      get: (name: string) => req.headers[name.toLowerCase()],
      header: (name: string) => req.headers[name.toLowerCase()],
      accepts: () => true,
      acceptsCharsets: () => true,
      acceptsEncodings: () => true,
      acceptsLanguages: () => true
    });
    
    // Express middleware will handle the request
    app(expressReq as any, res as any, () => {
      resolve(undefined);
    });
  });
}
