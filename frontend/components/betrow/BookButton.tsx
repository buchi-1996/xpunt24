// BookButton.tsx
"use client";

import React from 'react';
import { Button } from '../ui/button';

interface BookButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

const BookButton = ({ children, onClick }: BookButtonProps) => {
  return (
    <Button onClick={onClick} variant="outline" size="lg" className="text-xs md:text-sm px-6 w-full">
      {children}
    </Button>
  );
};

export default BookButton;
