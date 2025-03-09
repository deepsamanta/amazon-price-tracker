
import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/index';

// This is the entry point for Vercel serverless functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[vercel] Handling request: ${req.method} ${req.url}`);
  
  // Handle API requests only
  if (req.url?.startsWith('/api')) {
    // Forward the request to our Express app
    return new Promise((resolve, reject) => {
      const mockListener = () => {};
      const originalAppListen = app.listen;
      app.listen = mockListener as any;
      
      app(req, res);
      
      app.listen = originalAppListen;
      
      const checkIfDone = () => {
        if (res.writableEnded) {
          resolve(undefined);
        } else {
          setTimeout(checkIfDone, 10);
        }
      };
      
      checkIfDone();
    });
  } else {
    // For non-API requests, we should not get here due to the routes in vercel.json
    res.status(404).send('Not found');
  }
}
