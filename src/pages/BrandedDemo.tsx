import React from 'react';

const BrandedDemo: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to Matt Decanted</h1>
      <p className="text-lg mb-8 text-muted-foreground max-w-xl text-center">
        Explore wine knowledge, tasting games, and masterclasses with one of the world’s most accomplished winemakers. This is your world of wine, reimagined.
      </p>

      <div className="space-x-4">
        <button className="bg-primary text-primary-foreground hover:bg-muted transition px-6 py-3 rounded-lg">
          Start Exploring
        </button>
        <button className="bg-secondary text-secondary-foreground hover:bg-muted transition px-6 py-3 rounded-lg">
          View Pricing
        </button>
      </div>

      <div className="mt-12 p-6 rounded-xl border border-border bg-card shadow">
        <h2 className="text-2xl font-semibold mb-2">Card Component</h2>
        <p className="text-muted-foreground">
          This is a sample card using your Tailwind theme tokens for border, card background, and text.
        </p>
      </div>
    </div>
  );
};

export default BrandedDemo;
