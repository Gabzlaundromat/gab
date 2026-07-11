import { ID, Models, Query } from 'appwrite';
import { account, databases, appwriteConfig } from './appwrite';
import {
  User,
  AdminUser,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  UserRole,
  ApiResponse
} from './types';
import {
  userRegistrationSchema,
  walkInCustomerSchema,
  loginSchema,
  validateNigerianPhone
} from './validations';

// Maps a raw Appwrite `users` document (flat phone string, JSON-string addresses)
// to the nested `User` shape used throughout the app.
export function mapAppwriteDocToUser(rawDoc: any): User {
  let addresses = [];
  try {
    addresses = JSON.parse(rawDoc.addresses || '[]');
  } catch (e) {
    addresses = [];
  }

  return {
    $id: rawDoc.$id,
    $collectionId: rawDoc.$collectionId,
    $databaseId: rawDoc.$databaseId,
    $createdAt: rawDoc.$createdAt,
    $updatedAt: rawDoc.$updatedAt,
    $permissions: rawDoc.$permissions,
    email: rawDoc.email,
    firstName: rawDoc.firstName,
    lastName: rawDoc.lastName,
    phone: {
      number: rawDoc.phone || '',
      isWhatsApp: rawDoc.isWhatsAppNumber || false
    },
    addresses: addresses,
    dateOfBirth: rawDoc.dateOfBirth,
    gender: rawDoc.gender,
    isActive: rawDoc.isActive,
    emailVerified: rawDoc.emailVerified,
    phoneVerified: rawDoc.phoneVerified,
    totalOrders: rawDoc.totalOrders || 0,
    totalSpent: rawDoc.totalSpent || 0,
    loyaltyPoints: rawDoc.loyaltyPoints || 0,
    preferredPaymentMethod: rawDoc.preferredPaymentMethod,
    notes: rawDoc.notes,
    registrationSource: rawDoc.registrationSource || 'web',
    referredBy: rawDoc.referredBy
  };
}

// Authentication service for Gab'z Laundromat
export class AuthService {
  
  // Customer Registration
  async registerCustomer(userData: RegisterCredentials): Promise<ApiResponse<AuthUser>> {
    try {
      // Validate input data
      const validationResult = userRegistrationSchema.safeParse({
        ...userData,
        addresses: [{
          street: '',
          area: '',
          lga: 'Lagos Island',
          state: 'Lagos State'
        }] // Temporary default, will be updated during onboarding
      });

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Validate Nigerian phone number
      if (!validateNigerianPhone(userData.phone)) {
        return {
          success: false,
          error: 'Invalid Nigerian phone number format. Use +234XXXXXXXXX'
        };
      }

      // Create Appwrite account
      const appwriteUser = await account.create(
        ID.unique(),
        userData.email,
        userData.password,
        `${userData.firstName} ${userData.lastName}`
      );

      // Create user profile in database with Appwrite-compatible structure
      const userProfile = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isWhatsAppNumber: false,
        addresses: '[]', // Empty JSON array as string
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        registrationSource: 'web',
        role: 'customer'
      };

      // Save to Users collection
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        appwriteUser.$id,
        userProfile
      );

      // Create session for the new user (log them in)
      await account.createEmailPasswordSession(
        userData.email,
        userData.password
      );

      // Now send verification email (user is authenticated)
      await account.createVerification('http://localhost:3000/verify-email');

      return {
        success: true,
        data: {
          $id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          phone: userData.phone,
          emailVerification: appwriteUser.emailVerification,
          phoneVerification: appwriteUser.phoneVerification,
          prefs: appwriteUser.prefs
        },
        message: 'Registration successful. Please check your email for verification.'
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }
  }

  // Customer Login
  async loginCustomer(credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> {
    try {
      // Validate credentials
      const validationResult = loginSchema.safeParse(credentials);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Create session
      const session = await account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      // Get current user
      const user = await account.get();

      return {
        success: true,
        data: {
          $id: user.$id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
          prefs: user.prefs
        },
        message: 'Login successful'
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }
  }

  // Admin Login
  async loginAdmin(credentials: LoginCredentials): Promise<ApiResponse<{user: AuthUser, role: UserRole}>> {
    try {
      // Validate credentials
      const validationResult = loginSchema.safeParse(credentials);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Create session
      await account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      // Get current user
      const user = await account.get();

      // Check if user is admin by looking up in AdminUsers collection
      try {
        const adminUser = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.adminUsers,
          user.$id
        ) as AdminUser;

        if (!adminUser.isActive) {
          await this.logout();
          return {
            success: false,
            error: 'Admin account is deactivated'
          };
        }

        // Update last login
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.adminUsers,
          user.$id,
          {
            lastLogin: new Date().toISOString()
          }
        );

        return {
          success: true,
          data: {
            user: {
              $id: user.$id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              emailVerification: user.emailVerification,
              phoneVerification: user.phoneVerification,
              prefs: user.prefs
            },
            role: adminUser.role
          },
          message: 'Admin login successful'
        };

      } catch (adminError) {
        // User exists but is not an admin
        await this.logout();
        return {
          success: false,
          error: 'Access denied. Admin privileges required.'
        };
      }

    } catch (error: any) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }
  }

  // Get Current User
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const user = await account.get();
      return {
        success: true,
        data: {
          $id: user.$id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
          prefs: user.prefs
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'No active session found'
      };
    }
  }

  // Get User Profile (from database)
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    try {
      const rawProfile = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        userId
      );

      return {
        success: true,
        data: mapAppwriteDocToUser(rawProfile)
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }
  }

  // Look up a customer by phone number (used by staff for walk-in lookups)
  async getUserByPhone(phone: string): Promise<ApiResponse<User | null>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        [Query.equal('phone', phone), Query.limit(1)]
      );

      if (response.documents.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      return {
        success: true,
        data: mapAppwriteDocToUser(response.documents[0])
      };
    } catch (error: any) {
      console.error('Phone lookup error:', error);
      return {
        success: false,
        error: 'Failed to search for customer'
      };
    }
  }

  // Create a walk-in customer profile (staff-created, no Appwrite Auth account/login)
  async createWalkInCustomer(input: {
    firstName: string;
    lastName: string;
    phone: string;
    isWhatsApp?: boolean;
    notes?: string;
  }): Promise<ApiResponse<User>> {
    try {
      const validationResult = walkInCustomerSchema.safeParse(input);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      if (!validateNigerianPhone(input.phone)) {
        return {
          success: false,
          error: 'Invalid Nigerian phone number format. Use +234XXXXXXXXX'
        };
      }

      // Walk-ins don't have an email; synthesize a unique placeholder from
      // their (unique) phone number so the required/unique `email` attribute
      // is still satisfied without creating an Appwrite Auth account.
      const digitsOnly = input.phone.replace(/\D/g, '');
      const syntheticEmail = `${digitsOnly}@walkin.gabzlaundromat.local`;

      const userProfile = {
        email: syntheticEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        isWhatsAppNumber: input.isWhatsApp ?? false,
        addresses: '[]',
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        registrationSource: 'web',
        notes: input.notes,
        role: 'customer'
      };

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        ID.unique(),
        userProfile
      );

      return {
        success: true,
        data: mapAppwriteDocToUser(doc),
        message: 'Walk-in customer created successfully'
      };
    } catch (error: any) {
      console.error('Walk-in customer creation error:', error);
      if (error?.code === 409) {
        return {
          success: false,
          error: 'A customer with this phone number already exists'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to create walk-in customer'
      };
    }
  }

  // Get Admin Profile (from database)
  async getAdminProfile(userId: string): Promise<ApiResponse<AdminUser>> {
    try {
      const adminProfile = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        userId
      ) as AdminUser;

      return {
        success: true,
        data: adminProfile
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch admin profile'
      };
    }
  }

  // Logout
  async logout(): Promise<ApiResponse<null>> {
    try {
      await account.deleteSession('current');
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  // Password Reset
  async resetPassword(email: string): Promise<ApiResponse<null>> {
    try {
      await account.createRecovery(
        email,
        'http://localhost:3000/reset-password'
      );
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to send password reset email'
      };
    }
  }

  // Complete Password Reset
  async completePasswordReset(
    userId: string, 
    secret: string, 
    newPassword: string
  ): Promise<ApiResponse<null>> {
    try {
      await account.updateRecovery(userId, secret, newPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Email Verification
  async verifyEmail(userId: string, secret: string): Promise<ApiResponse<null>> {
    try {
      await account.updateVerification(userId, secret);
      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Email verification failed'
      };
    }
  }

  // Send Email Verification
  async sendEmailVerification(): Promise<ApiResponse<null>> {
    try {
      await account.createVerification('http://localhost:3000/verify-email');
      return {
        success: true,
        message: 'Verification email sent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
  }

  // Update Password
  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    try {
      await account.updatePassword(newPassword, currentPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      await account.get();
      return true;
    } catch {
      return false;
    }
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        userId
      );
      return true;
    } catch {
      return false;
    }
  }

  // Get all sessions
  async getSessions(): Promise<ApiResponse<Models.Session[]>> {
    try {
      const sessions = await account.listSessions();
      return {
        success: true,
        data: sessions.sessions
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch sessions'
      };
    }
  }

  // Delete specific session
  async deleteSession(sessionId: string): Promise<ApiResponse<null>> {
    try {
      await account.deleteSession(sessionId);
      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to delete session'
      };
    }
  }
}

// Create and export instance
export const authService = new AuthService();