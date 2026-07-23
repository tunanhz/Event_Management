import app from '../src/app';
import { connectDatabase } from '../src/config/database';

let isConnected = false;

export default async function handler(req: any, res: any) {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
  }
  return app(req, res);
}
