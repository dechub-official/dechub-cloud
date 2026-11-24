import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';

// Some Windows networks refuse the SRV lookups that mongodb+srv:// needs.
// Using public DNS servers for the lookup avoids that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDb(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}