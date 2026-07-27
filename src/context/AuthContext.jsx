import React, { createContext, useContext, useState, useEffect } from 'react';
import { getShopDetails, saveShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('volt_pos_auth') === 'true';
  });

  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('volt_pos_role') || null;
  });

  const [activePassword, setActivePassword] = useState(DEFAULT_SHOP_DETAILS.appPassword);
  const [activeStaffPassword, setActiveStaffPassword] = useState(DEFAULT_SHOP_DETAILS.staffPassword || 'staff123');

  // Sync latest passwords from shop details (local & cloud)
  useEffect(() => {
    async function loadPasswords() {
      const details = await getShopDetails();
      if (details) {
        if (details.appPassword) setActivePassword(details.appPassword);
        if (details.staffPassword) setActiveStaffPassword(details.staffPassword);
      }
    }
    loadPasswords();

    const handleShopUpdate = (e) => {
      if (e.detail) {
        if (e.detail.appPassword) setActivePassword(e.detail.appPassword);
        if (e.detail.staffPassword) setActiveStaffPassword(e.detail.staffPassword);
      }
    };

    window.addEventListener('volt_shop_updated', handleShopUpdate);
    return () => window.removeEventListener('volt_shop_updated', handleShopUpdate);
  }, []);

  const login = (passwordInput) => {
    const trimmed = (passwordInput || '').trim();
    if (trimmed === activePassword) {
      setIsAuthenticated(true);
      setUserRole('admin');
      sessionStorage.setItem('volt_pos_auth', 'true');
      sessionStorage.setItem('volt_pos_role', 'admin');
      return { success: true, role: 'admin' };
    }
    if (trimmed === activeStaffPassword) {
      setIsAuthenticated(true);
      setUserRole('staff');
      sessionStorage.setItem('volt_pos_auth', 'true');
      sessionStorage.setItem('volt_pos_role', 'staff');
      return { success: true, role: 'staff' };
    }

    return { 
      success: false, 
      error: 'Invalid password. (Admin default: admin123 | Staff default: staff123)' 
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    sessionStorage.removeItem('volt_pos_auth');
    sessionStorage.removeItem('volt_pos_role');
  };

  const changePassword = async (currentPasswordInput, newPasswordInput) => {
    if (currentPasswordInput !== activePassword) {
      throw new Error("Current Admin password is incorrect.");
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

  const changeStaffPassword = async (currentAdminPasswordInput, newStaffPasswordInput) => {
    if (currentAdminPasswordInput !== activePassword) {
      throw new Error("Current Admin password is required to change staff password.");
    }
    if (!newStaffPasswordInput || newStaffPasswordInput.trim().length < 3) {
      throw new Error("New staff password must be at least 3 characters long.");
    }

    const currentDetails = (await getShopDetails()) || DEFAULT_SHOP_DETAILS;
    const updatedDetails = {
      ...currentDetails,
      staffPassword: newStaffPasswordInput.trim(),
      updatedAt: new Date().toISOString()
    };

    await saveShopDetails(updatedDetails);
    setActiveStaffPassword(newStaffPasswordInput.trim());
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      login, 
      logout, 
      changePassword, 
      changeStaffPassword, 
      activePassword, 
      activeStaffPassword 
    }}>
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
