"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddress } from "@thirdweb-dev/react";
import { WalletConnection } from "./WalletConnection";
import { useAuth } from "@/context/AuthContext";
import { Home, FileText, Activity, Settings, Bot, List, Users, Shield, User, LogOut } from "lucide-react";
import { hasAdminAccess } from "@/lib/adminAuth";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Grant Pipeline", href: "/pipeline", icon: List },
  { name: "Submit Grant", href: "/submit", icon: FileText },
  { name: "My Grants", href: "/grants", icon: Bot },
  { name: "Agent Activity", href: "/activity", icon: Activity },
];

// Admin-only navigation item
const adminNavigation = { name: "Admin Dashboard", href: "/admin", icon: Shield };

export function Navigation() {
  const pathname = usePathname();
  const address = useAddress();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = hasAdminAccess(address);

  // Add admin link if user has admin access
  const navItems = isAdmin ? [...navigation, adminNavigation] : navigation;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <Link href="/" className="flex items-center group">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Grantify
              </span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:items-center sm:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Auth & Wallet */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline font-medium">{user?.display_name || user?.email || "Profile"}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                Login
              </Link>
            )}
            <div className="ml-2">
              <WalletConnection />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden border-t border-gray-200/50">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive
                    ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
