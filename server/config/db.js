import mongoose from 'mongoose';

// Strip query-selector operators ($gt, $ne, ...) from user-provided filter values.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

export async function connectDB(uri, { retries = 5, delayMs = 3000, log = console } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      log.info?.(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
      return mongoose.connection;
    } catch (err) {
      log.error?.(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export const isDbConnected = () => mongoose.connection.readyState === 1;

export async function disconnectDB() {
  await mongoose.disconnect();
}
