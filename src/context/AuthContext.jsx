import React, { createContext, useContext, useState, useEffect } from 'react';
import { getShopDetails, saveShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('volt_pos_auth') === 'true';
  });
  const [activePassword, setActivePassword] = useState(DEFAULT_SHOP_DETAILS.appPassword);

  // Sync latest password from shop details (local & cloud)
  useEffect(() => {
    async function loadPassword() {
      const details = await getShopDetails();
      if (details && details.appPassword) {
        setActivePassword(details.appPassword);
      }
    }
    loadPassword();

    const handleShopUpdate = (e) => {
      if (e.detail && e.detail.appPassword) {
        setActivePassword(e.detail.appPassword);
      }
    };

    window.addEventListener('volt_shop_updated', handleShopUpdate);
    return () => window.removeEventListener('volt_shop_updated', handleShopUpdate);
  }, []);

  const login = (passwordInput) => {
    if (passwordInput === activePassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('volt_pos_auth', 'true');
      return { success: true };
    }
    return { success: false, error: 'Invalid password. Default is admin123' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('volt_pos_auth');
  };

  const changePassword = async (currentPasswordInput, newPasswordInput) => {
    if (currentPasswordInput !== activePassword) {
      throw new Error("Current password is incorrect.");
    }
    if (!newPasswordInput || newPasswordInput.trim().length < 3) {
      throw new Error("New password must be at least 3 characters long.");
    }

    const currentDetails = (await getShopDetails()) || DEFAULT_SHOP_DETAILS;
    const updatedDetails = {
      ...currentDetails,
      appPassword: newPasswordInput.trim(),
      updatedAt: new Date().toISOString()
    };

    await saveShopDetails(updatedDetails);
    setActivePassword(newPasswordInput.trim());
    return true;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePassword, activePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
