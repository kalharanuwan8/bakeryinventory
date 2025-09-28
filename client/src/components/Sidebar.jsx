import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Building2,
  Package,
  FileText,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/main-bakery', icon: Store, label: 'Main Bakery' },
    { path: '/branches', icon: Building2, label: 'Branches' },
    { path: '/items', icon: Package, label: 'Items' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-green-800">
      {/* Logo */}
      <div className="p-6 border-b border-green-700">
        <h1 className="text-2xl font-bold text-white">Vihanga Bakery</h1>
        <p className="text-green-200 text-sm">Inventory Management</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
                isActive
                  ? 'bg-green-700 text-white border-r-4 border-green-400'
                  : 'text-green-200 hover:bg-green-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-green-700 p-4">
        <div className="flex items-center mb-3 text-green-200">
          <User className="w-8 h-8 mr-3 bg-green-700 rounded-full p-1" />
          <div>
            <div className="font-medium text-white">{user?.username}</div>
            <div className="text-sm">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-green-200 hover:bg-green-700 hover:text-white rounded transition-colors duration-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-green-600 text-white rounded-md"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-screen">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 h-screen">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-white z-50"
            >
              <X className="w-6 h-6" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;