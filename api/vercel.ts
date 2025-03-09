
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
    // Express middleware will handle the request
    app(req, res, () => {
      resolve(undefined);
    });
  });
}
