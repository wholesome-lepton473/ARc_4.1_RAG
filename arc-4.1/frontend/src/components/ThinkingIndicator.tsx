import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SearchStep } from '../types';

interface ThinkingIndicatorProps {
    steps: SearchStep[];
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ steps }) => {
    const activeStep = steps.find(s => s.status === 'in-progress') || steps[steps.length - 1];

    return (
        <div className="w-full max-w-3xl mb-4 pl-1">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 bg-[var(--bg-element)] px-3 py-1.5 rounded-full border border-[var(--border-color)]"
            >
                <Loader2 className="w-3.5 h-3.5 text-[var(--text-primary)] animate-spin" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {activeStep?.label || 'Working...'}
                </span>
            </motion.div>
        </div>
    );
};
