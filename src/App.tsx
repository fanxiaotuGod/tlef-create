import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { store } from './store';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CourseView from './components/CourseView';
import QuizView from './components/QuizView';
import UserAccount from './components/UserAccount';
import Login from './components/Login';
import NotFound from "./pages/NotFound";
import { useState, useEffect } from 'react';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create/auth/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  };

  // Loading state while checking authentication
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/course/:courseId" element={isAuthenticated ? <Layout><CourseView /></Layout> : <Navigate to="/login" />} />
          <Route path="/course/:courseId/quiz/:quizId" element={isAuthenticated ? <Layout><QuizView /></Layout> : <Navigate to="/login" />} />
          <Route path="/account" element={isAuthenticated ? <Layout><UserAccount /></Layout> : <Navigate to="/login" />} />
          
          {/* SAML callback route */}
          <Route path="/auth/callback" element={<AuthCallback onAuthChange={checkAuth} />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
};

// Auth callback component to handle SAML return
const AuthCallback = ({ onAuthChange }: { onAuthChange: () => void }) => {
  useEffect(() => {
    onAuthChange();
    window.location.href = '/';
  }, [onAuthChange]);
  
  return <div>Authenticating...</div>;
};

export default App;
