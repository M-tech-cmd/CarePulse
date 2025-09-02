import * as sdk from 'node-appwrite';

// Add this debug logging
console.log('🔍 Environment Variables Debug:');
console.log('NEXT_PUBLIC_ENDPOINT:', process.env.NEXT_PUBLIC_ENDPOINT);
console.log('PROJECT_ID:', process.env.PROJECT_ID);
console.log('API_KEY exists:', !!process.env.API_KEY);
console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('APPWRITE') || key.includes('ENDPOINT') || key.includes('PROJECT')));

export const {
  NEXT_PUBLIC_ENDPOINT: ENDPOINT,
  PROJECT_ID,
  API_KEY,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  DOCTOR_COLLECTION_ID,
  APPOINTMENT_COLLECTION_ID,
  NEXT_PUBLIC_BUCKET_ID: BUCKET_ID,
} = process.env;

// Add this debug logging too
console.log('📋 Extracted Values:');
console.log('ENDPOINT:', ENDPOINT);
console.log('PROJECT_ID:', PROJECT_ID);
console.log('API_KEY exists:', !!API_KEY);

const client = new sdk.Client();

client.setEndpoint(ENDPOINT!).setProject(PROJECT_ID!).setKey(API_KEY!);

export const databases = new sdk.Databases(client);
export const users = new sdk.Users(client);
export const messaging = new sdk.Messaging(client);
export const storage = new sdk.Storage(client);