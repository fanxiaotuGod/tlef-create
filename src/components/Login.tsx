import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { GraduationCap, Sparkles, Shield, ArrowRight } from 'lucide-react';
import '../styles/components/Login.css';

const Login = () => {
  const handleLogin = () => {
    // Redirect to backend SAML login endpoint
    window.location.href = `${import.meta.env.VITE_API_URL}/api/create/auth/saml/login`;
  };

  useEffect(() => {
    // Check if we're returning from SAML callback with error
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      console.error('Login error:', error);
    }
  }, []);

  return (
    <div className="login-container">
      {/* Background Pattern */}
      <div className="login-background">
        <div className="bg-pattern"></div>
        <div className="bg-gradient"></div>
      </div>

      {/* Main Content */}
      <div className="login-content">
        {/* Logo and Branding Section */}
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <GraduationCap size={32} />
            </div>
            <div className="logo-text">
              <h1 className="brand-title">TLEF CREATE</h1>
              <div className="brand-badge">
                <Sparkles size={14} />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
          <p className="brand-subtitle">
            Next-generation quiz generator for modern education
          </p>
        </div>

        {/* Login Card */}
        <Card className="login-card">
          <CardHeader className="login-card-header">
            <CardTitle className="login-title">
              Welcome Back
            </CardTitle>
            <CardDescription className="login-description">
              Sign in with your institutional credentials to continue creating intelligent quizzes
            </CardDescription>
          </CardHeader>
          
          <CardContent className="login-card-content">
            {/* Features Preview */}
            <div className="features-preview">
              <div className="feature-item">
                <div className="feature-icon">
                  <Sparkles size={16} />
                </div>
                <span>AI-Generated Questions</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <GraduationCap size={16} />
                </div>
                <span>Pedagogical Approaches</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Shield size={16} />
                </div>
                <span>Secure & Private</span>
              </div>
            </div>

            {/* Login Button */}
            <Button 
              onClick={handleLogin}
              className="login-button"
              size="lg"
            >
              <span>Sign in with UBC CWL</span>
              <ArrowRight size={18} />
            </Button>

            {/* Terms */}
            <div className="login-terms">
              <p>
                By signing in, you agree to our{' '}
                <a href="#" className="terms-link">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="terms-link">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="login-footer">
          <p>University of British Columbia • Teaching and Learning Enhancement Fund</p>
        </div>
      </div>
    </div>
  );
};

export default Login;