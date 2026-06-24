import logger from "../utils/logger.js";
/**
 * ServiceTones Frontend Configuration
 * 
 * Centralized configuration management for all Vite environment variables.
 * Works seamlessly with Render Dashboard environment variables.
 * 
 * On Render: Variables come from Dashboard → Environment tab (VITE_ prefixed)
 * Locally: Variables come from .env.local file
 */

const config = {
  // ====================================
  // Environment
  // ====================================
  environment: import.meta.env.VITE_ENVIRONMENT || 'dev',
  
  // ====================================
  // API URLs
  // ====================================
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\\n/g, '').trim(),
  backendUrl: (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\\n/g, '').trim(),
  
  // ====================================
  // Firebase Authentication Configuration
  // ====================================
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  },
  
  // ====================================
  // Stripe
  // ====================================
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  },
  
  // ====================================
  // Helper Methods
  // ====================================
  
  /**
   * Check if running in production environment
   */
  isProduction() {
    return this.environment === 'production';
  },
  
  /**
   * Check if running in development environment
   */
  isDevelopment() {
    return this.environment === 'dev' || this.environment === 'development';
  },
  
  /**
   * Check if running in stagging environment
   */
  isStagging() {
    return this.environment === 'stagging' || this.environment === 'stagging';
  },
  
  /**
   * Validate configuration on app startup
   * 
   * @throws {Error} If any required environment variable is missing
   * @returns {boolean} True if all required variables are present
   */
  validate() {
    const required = {
      'API URL': this.apiUrl,
      'Firebase API Key': this.firebase.apiKey,
      'Firebase Auth Domain': this.firebase.authDomain,
      'Firebase Project ID': this.firebase.projectId,
      'Firebase App ID': this.firebase.appId,
      'Stripe Publishable Key': this.stripe.publishableKey,
    };
    
    const missing = Object.entries(required)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);
    
    if (missing.length > 0) {
      const errorMsg = [
        '',
        '='.repeat(70),
        '❌ FRONTEND CONFIGURATION ERROR',
        '='.repeat(70),
        '',
        'Missing required environment variables:',
        ...missing.map(key => `  • ${key}`),
        '',
        'Where to set them:',
        '',
        '  📍 Local Development:',
        '     Create .env.local file with VITE_ prefixed variables',
        '',
        '  📍 Render Deployment:',
        '     Go to: Dashboard → Your Service → Environment tab',
        '     Add the missing variables with VITE_ prefix',
        '',
        '='.repeat(70),
        ''
      ].join('\n');
      
      logger.error(errorMsg);
      throw new Error('Missing required configuration');
    }
    
    const envEmoji = {
      'production': '🚀',
      'stagging': '🔧',
      'dev': '🛠️',
      'development': '🛠️'
    }[this.environment] || '⚙️';
    
    logger.log(`\n${envEmoji} Frontend config validated for '${this.environment}' environment`);
    logger.log(`   └─ API: ${this.apiUrl}`);
    logger.log(`   └─ Firebase Project: ${this.firebase.projectId}`);
    logger.log("");
    
    return true;
  }
};

// Auto-validate on import and log configuration
// This is especially important for mobile builds to debug API connectivity
try {
  // Always log the configuration being used
  const envEmoji = {
    'production': '🚀',
    'stagging': '🔧',
    'dev': '🛠️',
    'development': '🛠️'
  }[config.environment] || '⚙️';
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${envEmoji} SERVICETONES - ${config.environment.toUpperCase()}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📡 API: ${config.apiUrl}`);
  console.log(`🔙 Backend: ${config.backendUrl}`);
  console.log(`🔥 Firebase Project: ${config.firebase.projectId || 'Missing ✗'}`);
  console.log(`💳 Stripe: ${config.stripe.publishableKey ? 'Configured ✓' : 'Missing ✗'}`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Validate in development mode
  if (import.meta.env.DEV) {
    config.validate();
  }
} catch (error) {
  console.error('❌ Config initialization error:', error);
}

export default config;
