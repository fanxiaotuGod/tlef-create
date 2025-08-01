import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TLEF CREATE</CardTitle>
          <CardDescription>
            AI-Powered Quiz Generator for Education
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            Sign in with your institutional credentials to continue
          </div>
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            Sign in with UBC CWL
          </Button>
          <div className="text-center text-xs text-gray-500 mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;