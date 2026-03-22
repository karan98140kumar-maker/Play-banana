export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is not valid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. It should be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion.';
    case 'auth/cancelled-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/internal-error':
      return 'An internal error occurred. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid credentials provided. Please check your email and password.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google Sign-In. Please add it in Firebase Console.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};
