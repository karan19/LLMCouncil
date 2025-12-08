'use client';

import { motion, type Easing } from 'framer-motion';

interface AnimatedLogoProps {
    size?: number;
    className?: string;
}

export default function AnimatedLogo({ size = 64, className = '' }: AnimatedLogoProps) {
    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 64 64"
            className={className}
            initial="hidden"
            animate="visible"
        >
            {/* Background circle */}
            <motion.circle
                cx="32"
                cy="32"
                r="30"
                fill="#2563EB"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as Easing }}
            />

            {/* Main chat bubble (center-left) */}
            <motion.path
                d="M22 22 h14 a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-8 l-6 4 v-4 h-0 a4 4 0 0 1 -4 -4 v-6 a4 4 0 0 1 4 -4z"
                fill="#EFF6FF"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as Easing }}
            />

            {/* Secondary bubble (center-right, overlapping) */}
            <motion.path
                d="M28 32 h14 a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-6 l-6 4 v-4 a4 4 0 0 1 -4 -4 v-6 a4 4 0 0 1 4 -4z"
                fill="#DBEAFE"
                opacity="0.85"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.85 }}
                transition={{ delay: 0.45, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as Easing }}
            />

            {/* Small bubble (top-left) */}
            <motion.path
                d="M14 14 h10 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-5 l-5 3 v-3 a3 3 0 0 1 -3 -3 v-5 a3 3 0 0 1 3 -3z"
                fill="#EFF6FF"
                opacity="0.85"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.85 }}
                transition={{ delay: 0.6, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as Easing }}
            />

            {/* Small bubble (top-right) */}
            <motion.path
                d="M40 12 h10 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-5 l-4 3 v-3 a3 3 0 0 1 -3 -3 v-5 a3 3 0 0 1 3 -3z"
                fill="#EFF6FF"
                opacity="0.85"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.85 }}
                transition={{ delay: 0.75, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as Easing }}
            />

            {/* Small bubble (bottom-left) */}
            <motion.path
                d="M12 40 h10 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-5 l-4 3 v-3 a3 3 0 0 1 -3 -3 v-5 a3 3 0 0 1 3 -3z"
                fill="#EFF6FF"
                opacity="0.85"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.85 }}
                transition={{ delay: 0.9, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as Easing }}
            />
        </motion.svg>
    );
}
