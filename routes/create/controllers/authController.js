import express from 'express';
import { successResponse, errorResponse } from '../utils/responseFormatter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../config/constants.js';
import { passport, samlStrategy } from '../middleware/passport.js';

const router = express.Router();

/**
 * GET /api/auth/me  
 * Get current user profile (SAML authentication only)
 */
router.get('/me', asyncHandler(async (req, res) => {
  console.log('🔍 /me endpoint - checking authentication');
  console.log('🔍 isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
  console.log('🔍 user exists:', !!req.user);
  
  // Check for Passport/SAML session authentication
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    // SAML authentication via Passport
    const { default: User } = await import('../models/User.js');
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (user) {
      console.log('✅ /me - User authenticated:', user.cwlId);
      return res.status(200).json({
        authenticated: true,
        user: {
          id: user._id,
          cwlId: user.cwlId,
          stats: user.stats,
          lastLogin: user.lastLogin
        }
      });
    }
  }

  // No valid authentication
  console.log('❌ /me - User not authenticated');
  return res.status(200).json({
    authenticated: false
  });
}));

/**
 * GET /api/auth/saml/login
 * Initiate SAML login
 */
router.get('/saml/login', passport.authenticate('saml'));

/**
 * POST /api/auth/saml/callback
 * Handle SAML callback
 */
router.post('/saml/callback', 
  passport.authenticate('saml', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ SAML callback successful');
    // Successful authentication, redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/`);
  }
);

/**
 * GET /api/auth/logout
 * SAML Single Logout - clears both local and IdP sessions
 */
router.get('/logout', (req, res, next) => {
  console.log('🚪 GET /logout - SAML logout requested');
  console.log('🔍 User authenticated?', req.isAuthenticated ? req.isAuthenticated() : false);
  
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('❌ User not authenticated, redirecting to login');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login`);
  }

  console.log('🔄 Initiating SAML logout...');
  samlStrategy.logout(req, (err, requestUrl) => {
    if (err) {
      console.error('❌ SAML logout error:', err);
      return res.status(500).json({ 
        error: { 
          code: 'LOGOUT_ERROR', 
          message: 'Logout failed', 
          timestamp: new Date().toISOString() 
        } 
      });
    }

    console.log('🔑 SAML logout URL:', requestUrl);
    
    // Clear local session
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error('❌ Passport logout error:', logoutErr);
      } else {
        console.log('✅ Passport logout successful');
      }
      
      // Destroy session
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('❌ Session destruction error:', sessionErr);
        } else {
          console.log('✅ Session destroyed');
        }
        
        console.log('✅ Session cleared');
        
        // Redirect to SAML IdP logout URL to clear IdP session
        console.log('🔄 Redirecting to IdP logout:', requestUrl);
        res.redirect(requestUrl);
      });
    });
  });
});

/**
 * GET /api/auth/logout/callback
 * Handle SAML logout response from IdP
 */
router.get('/logout/callback', (req, res) => {
  console.log('✅ SAML logout callback received');
  // The SAML IdP has processed the logout
  
  if (req.session) {
    req.session.destroy(() => {
      console.log('🔄 Redirecting to login after logout');
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login`);
    });
  } else {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login`);
  }
});

export default router;