import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, useSpring, useTransform, animate } from 'motion/react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, hover, ...props }, ref) => (
  <motion.div 
    ref={ref as any}
    whileHover={hover ? { y: -6, scale: 1.01 } : undefined}
    whileTap={hover ? { scale: 0.98 } : undefined}
    className={cn(
      "bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300",
      hover && "hover:shadow-[0_20px_40px_-12px_rgba(79,70,229,0.15)] cursor-pointer",
      className
    )} 
    {...props as any} 
  />
));

Card.displayName = 'Card';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children,
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "hover:bg-slate-100 text-slate-600",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary",
    accent: "bg-accent text-white hover:opacity-90 shadow-xl shadow-accent/20"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-7 py-3.5 text-sm",
    lg: "px-10 py-5 text-base",
    icon: "p-3"
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.92, rotate: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={cn(
        "rounded-2xl font-display font-black transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase tracking-widest",
        variants[variant],
        sizes[size],
        className
      )} 
      disabled={loading || props.disabled}
      {...props as any} 
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
};

export const CoinCounter = ({ value, className }: { value: number, className?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);
  
  useEffect(() => {
    if (value !== displayValue) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 300);
      
      const controls = animate(displayValue, value, {
        duration: 0.8,
        onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
        ease: "easeOut"
      });
      
      return () => {
        controls.stop();
        clearTimeout(timer);
      };
    }
  }, [value]);

  return (
    <motion.span 
      animate={isUpdating ? { scale: [1, 1.2, 1], color: ['#f97316', '#ea580c', '#f97316'] } : {}}
      transition={{ duration: 0.3 }}
      className={cn("inline-block", className)}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all outline-none",
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';
