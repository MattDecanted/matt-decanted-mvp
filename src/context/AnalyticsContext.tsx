import React, { createContext, useContext } from 'react';

interface AnalyticsContextType {
  track: (event: string, properties?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const track = (event: string, properties?: Record<string, any>) => {
    // Stub for analytics - would integrate with your preferred service
    console.log('Analytics Event:', event, properties);
    
    // Example implementation:
    // window.gtag?.('event', event, properties);
    // or
    // window.analytics?.track(event, properties);
  };

  const value = {
    track,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}