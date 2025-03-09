import { VercelRequest, VercelResponse } from '@vercel/node';
import app from './index';

// This is the entry point for Vercel serverless functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Express doesn't have a direct way to handle serverless functions
  // So we need to create a custom handler that will pass the request to our Express app
  
  console.log(`[vercel] Handling request: ${req.method} ${req.url}`);
  
  // Let the Express app handle the request
  return new Promise((resolve, reject) => {
    // Mock the Express app's listen method to capture the response
    const mockListener = () => {};
    const originalAppListen = app.listen;
    app.listen = mockListener as any;
    
    // Forward the request to our Express app
    app(req, res);
    
    // Restore the original listen method
    app.listen = originalAppListen;
    
    // Express won't signal when it's done, so we need to check if the response is finished
    const checkIfDone = () => {
      if (res.writableEnded) {
        resolve(undefined);
      } else {
        setTimeout(checkIfDone, 10);
      }
    };
    
    checkIfDone();
  });
}