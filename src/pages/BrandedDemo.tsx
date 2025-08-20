import React from 'react';

const BrandedDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center p-8">
      <div className="text-center max-w-2xl space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Welcome to Matt Decanted</h1>
        <p className="text-lg">
          A smarter way to discover wine. Learn by tasting. Earn points. Collect badges.
        </p>
        <div className="mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default BrandedDemo;
