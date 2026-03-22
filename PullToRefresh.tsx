import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const controls = useAnimation();

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    const isAtTop = containerRef.current?.scrollTop === 0 || window.scrollY === 0;
    if (isAtTop && !isRefreshing) {
      startY.current = e.touches[0].pageY;
    } else {
      startY.current = -1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === -1 || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Prevent default scrolling when pulling down
      if (e.cancelable) e.preventDefault();
      
      // Apply resistance
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (startY.current === -1 || isRefreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        // Add a small delay for better UX
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = -1;
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50"
        style={{ 
          top: -40,
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance / PULL_THRESHOLD
        }}
      >
        <div className={cn(
          "w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-100 transition-transform",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw 
            className={cn(
              "w-5 h-5 text-primary",
              !isRefreshing && pullDistance >= PULL_THRESHOLD && "rotate-180 transition-transform"
            )} 
            style={{ 
              transform: !isRefreshing ? `rotate(${pullDistance * 2}deg)` : undefined 
            }}
          />
        </div>
      </div>

      {/* Content */}
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
