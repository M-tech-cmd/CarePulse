"use server";

import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

import {
  BUCKET_ID,
  DATABASE_ID,
  databases,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  storage,
  users,
} from "../appwrite.config";

// Safe parseStringify
export async function parseStringify(value: any) {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

// Retry logic for API calls (exclude 409 errors)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      if (error.code !== 409) { // Skip retry on duplicate user error
        console.warn(`Retry ${i + 1}/${retries} failed, waiting to retry...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error; // Pass 409 to catch block immediately
      }
    }
  }
  throw new Error("Max retries reached");
}

// ==========================
// USERS
// ==========================

// Create User with optimized retry
export async function createUser(user: CreateUserParams) {
  try {
    console.log('Creating user with data:', { 
      email: user.email, 
      phone: user.phone, 
      name: user.name 
    });

    const newUser = await withRetry(() =>
      users.create(ID.unique(), user.email, user.phone, undefined, user.name)
    );

    console.log("New user created successfully:", newUser);
    
    // Verify user object has required properties
    if (!newUser || !newUser.$id) {
      console.error('Invalid user object returned:', newUser);
      throw new Error('Invalid user object returned from Appwrite');
    }
    
    return parseStringify(newUser);
  } catch (error: any) {
    console.error('User creation error details:', {
      message: error.message,
      code: error.code,
      type: error.type
    });

    if (error && error.code === 409) {
      console.log("User already exists, searching for existing user...");
      try {
        const existingUser = await withRetry(() =>
          users.list([Query.equal("email", [user.email])])
        );
        
        console.log('Existing user search result:', existingUser);
        
        if (existingUser.users.length > 0) {
          const foundUser = existingUser.users[0];
          console.log('Found existing user:', foundUser);
          return parseStringify(foundUser);
        } else {
          console.log('No existing user found despite 409 error');
          return null;
        }
      } catch (searchError) {
        console.error('Search for existing user failed:', searchError);
        throw searchError;
      }
    }
    
    console.error("An error occurred while creating a new user:", error);
    throw error;
  }
}

// Get User with retry
export async function getUser(userId: string) {
  try {
    console.log('Fetching user with ID:', userId);
    const user = await withRetry(() => users.get(userId));
    console.log('User fetched successfully:', user);
    return parseStringify(user);
  } catch (error: any) {
    console.error('Error fetching user:', {
      userId,
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

// Update User
export async function updateUser(
  userId: string,
  updates: Partial<CreateUserParams>
) {
  try {
    console.log('Updating user:', userId, updates);
    const updatedUser = await withRetry(() =>
      users.update(userId, {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
      })
    );

    console.log('User updated successfully:', updatedUser);
    return parseStringify(updatedUser);
  } catch (error) {
    console.error("An error occurred while updating user:", error);
    throw error;
  }
}

// ==========================
// PATIENTS
// ==========================

// Register Patient - Fixed for required fields
export async function registerPatient({
  identificationDocument,
  ...patient
}: RegisterUserParams) {
  try {
    console.log('Registering patient:', patient);
    
    let file;
    let identificationDocumentUrl = ""; // Use empty string instead of null
    let identificationDocumentId = ""; // Use empty string instead of null

    // Handle file upload separately to avoid blocking registration
    if (identificationDocument) {
      try {
        console.log('Starting file upload...');
        
        const blobFile = identificationDocument.get("blobFile") as Blob;
        const fileName = identificationDocument.get("fileName") as string;
        
        // Add file size validation
        if (blobFile && blobFile.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('File too large. Maximum size is 5MB.');
        }

        const inputFile = InputFile.fromBuffer(blobFile, fileName);

        // Upload with timeout
        const uploadTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('File upload timeout after 15 seconds')), 15000)
        );

        file = await Promise.race([
          withRetry(() => storage.createFile(BUCKET_ID!, ID.unique(), inputFile)),
          uploadTimeout
        ]);

        identificationDocumentUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
        identificationDocumentId = file.$id;
        
        console.log('File upload successful:', file.$id);
      } catch (fileError) {
        console.error("Error uploading identification document:", fileError);
        // Continue with registration even if file upload fails
        console.log('Continuing registration without document...');
      }
    }

    // Create patient document
    const newPatient = await withRetry(() =>
      databases.createDocument(
        DATABASE_ID!,
        PATIENT_COLLECTION_ID!,
        ID.unique(),
        {
          identificationDocumentId,
          identificationDocumentUrl,
          ...patient,
        }
      )
    );

    console.log('Patient registered successfully:', newPatient);
    return parseStringify(newPatient);
  } catch (error: any) {
    console.error('Patient registration failed:', {
      message: error.message,
      code: error.code,
      patient: patient
    });
    throw error;
  }
}

// Get Patient
export async function getPatient(userId: string) {
  try {
    console.log('Fetching patient for user:', userId);
    
    const patients = await withRetry(() =>
      databases.listDocuments(
        DATABASE_ID!,
        PATIENT_COLLECTION_ID!,
        [Query.equal("userId", userId)]
      )
    );

    console.log('Patient search result:', patients);

    if (patients.documents.length > 0) {
      const patient = patients.documents[0];
      console.log('Patient found:', patient);
      return parseStringify(patient);
    } else {
      console.log('No patient found for user:', userId);
      return null;
    }
  } catch (error: any) {
    console.error('Error fetching patient:', {
      userId,
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

// Update Patient
export async function updatePatient(
  patientId: string,
  updates: Partial<RegisterUserParams>
) {
  try {
    console.log('Updating patient:', patientId, updates);
    
    let file;
    let identificationDocumentUrl = updates.identificationDocumentUrl || "";
    let identificationDocumentId = updates.identificationDocumentId || "";

    if (updates.identificationDocument) {
      try {
        console.log('Uploading new identification document...');
        
        const blobFile = updates.identificationDocument.get("blobFile") as Blob;
        const fileName = updates.identificationDocument.get("fileName") as string;
        
        // Add file size validation
        if (blobFile && blobFile.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('File too large. Maximum size is 5MB.');
        }

        const inputFile = InputFile.fromBuffer(blobFile, fileName);

        file = await withRetry(() =>
          storage.createFile(BUCKET_ID!, ID.unique(), inputFile)
        );
        
        identificationDocumentUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
        identificationDocumentId = file.$id;
        
        console.log('New file uploaded successfully:', file.$id);
      } catch (fileError) {
        console.error("Error uploading new identification document:", fileError);
        // Continue with update even if file upload fails
      }
    }

    const updatedPatient = await withRetry(() =>
      databases.updateDocument(
        DATABASE_ID!,
        PATIENT_COLLECTION_ID!,
        patientId,
        {
          ...updates,
          identificationDocumentId,
          identificationDocumentUrl,
        }
      )
    );

    console.log('Patient updated successfully:', updatedPatient);
    return parseStringify(updatedPatient);
  } catch (error) {
    console.error("An error occurred while updating patient:", error);
    throw error;
  }
}