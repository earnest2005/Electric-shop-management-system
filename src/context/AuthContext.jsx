import React, { createContext, useContext, useState, useEffect } from 'react';
import { getShopDetails, saveShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Always initialize user state to null on application startup so the Login page is always displayed first
  const [user, setUser] = useState(null);

  const isAuthenticated = !!user;
  const userRole = user ? user.role : null;

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

  const login = (usernameInput, passwordInput) => {
    let username = '';
    let password = '';

    if (typeof usernameInput === 'object' && usernameInput !== null) {
      username = (usernameInput.username || '').trim().toLowerCase();
      password = (usernameInput.password || '').trim();
    } else if (passwordInput !== undefined) {
      username = (usernameInput || '').trim().toLowerCase();
      password = (passwordInput || '').trim();
    } else {
      // Single argument passed (could be password or string)
      const inputStr = (usernameInput || '').trim();
      if (inputStr === activePassword) {
        username = 'admin';
        password = inputStr;
      } else if (inputStr === activeStaffPassword) {
        username = 'staff';
        password = inputStr;
      } else {
        password = inputStr;
      }
    }

    // Validate Admin
    if ((username === 'admin' || !username) && password === activePassword) {
      const userObj = { username: 'admin', role: 'admin' };
      setUser(userObj);
      sessionStorage.setItem('volt_pos_auth', 'true');
      sessionStorage.setItem('volt_pos_role', 'admin');
      sessionStorage.setItem('volt_pos_user', JSON.stringify(userObj));
      localStorage.setItem('volt_pos_user', JSON.stringify(userObj));
      return { success: true, role: 'admin', user: userObj };
    }

    // Validate Staff
    if ((username === 'staff' || !username) && password === activeStaffPassword) {
      const userObj = { username: 'staff', role: 'staff' };
      setUser(userObj);
      sessionStorage.setItem('volt_pos_auth', 'true');
      sessionStorage.setItem('volt_pos_role', 'staff');
      sessionStorage.setItem('volt_pos_user', JSON.stringify(userObj));
      localStorage.setItem('volt_pos_user', JSON.stringify(userObj));
      return { success: true, role: 'staff', user: userObj };
    }

    return { 
      success: false, 
      error: 'Invalid credentials. (Admin: admin / admin123 | Staff: staff / staff123)' 
    };
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}
    try {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } catch (e) {}
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
      user,
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

