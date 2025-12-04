"use client";

import { Navigation } from "./Navigation";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageLayout({ children, title, description }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
