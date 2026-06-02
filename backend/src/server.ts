import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`\n🚀 Server running on http://localhost:${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
      console.log(`💾 Database: ${config.mongodbUri}`);
      console.log(`🔗 Frontend URL: ${config.frontendUrl}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
