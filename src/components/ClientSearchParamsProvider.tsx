'use client';

import { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

// Create a context to share search params safely
export type SearchParamsContextType = {
  searchParams: URLSearchParams;
  getParam: (name: string) => string | null;
};

// Component to safely use search params in client components
export default function ClientSearchParamsProvider({ 
  children, 
  render 
}: { 
  children?: ReactNode;
  render: (params: SearchParamsContextType) => ReactNode;
}) {
  const searchParams = useSearchParams();
  
  const getParam = (name: string) => {
    return searchParams.get(name);
  };
  
  return (
    <>
      {render({ searchParams, getParam })}
      {children}
    </>
  );
} 