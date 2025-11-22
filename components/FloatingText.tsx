import React, { useEffect, useState } from 'react';

interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface FloatingTextProps {
  floaters: Floater[];
  onRemove: (id: number) => void;
}

export const FloatingText: React.FC<FloatingTextProps> = ({ floaters, onRemove }) => {
  return (
    <>
      {floaters.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none fixed z-50 text-3xl font-black drop-shadow-lg"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            animation: 'floatUp 1.2s forwards ease-out'
          }}
          onAnimationEnd={() => onRemove(f.id)}
        >
          {f.text}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </>
  );
};