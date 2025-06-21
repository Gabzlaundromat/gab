import { ID, Models } from 'appwrite';
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
  loginSchema, 
  validateNigerianPhone 
} from './validations';

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

      // Convert Appwrite format back to our User type
      let addresses = [];
      try {
        addresses = JSON.parse(rawProfile.addresses || '[]');
      } catch (e) {
        addresses = [];
      }

      const userProfile: User = {
        $id: rawProfile.$id,
        $collectionId: rawProfile.$collectionId,
        $databaseId: rawProfile.$databaseId,
        $createdAt: rawProfile.$createdAt,
        $updatedAt: rawProfile.$updatedAt,
        $permissions: rawProfile.$permissions,
        email: rawProfile.email,
        firstName: rawProfile.firstName,
        lastName: rawProfile.lastName,
        phone: {
          number: rawProfile.phone || '',
          isWhatsApp: rawProfile.isWhatsAppNumber || false
        },
        addresses: addresses,
        dateOfBirth: rawProfile.dateOfBirth,
        gender: rawProfile.gender,
        isActive: rawProfile.isActive,
        emailVerified: rawProfile.emailVerified,
        phoneVerified: rawProfile.phoneVerified,
        totalOrders: rawProfile.totalOrders || 0,
        totalSpent: rawProfile.totalSpent || 0,
        loyaltyPoints: rawProfile.loyaltyPoints || 0,
        preferredPaymentMethod: rawProfile.preferredPaymentMethod,
        notes: rawProfile.notes,
        registrationSource: rawProfile.registrationSource || 'web',
        referredBy: rawProfile.referredBy
      };

      return {
        success: true,
        data: userProfile
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch user profile'
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