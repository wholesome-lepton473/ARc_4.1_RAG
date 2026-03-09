import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    isSidebarOpen: boolean;
    onSidebarClose: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar, isSidebarOpen, onSidebarClose }) => {
    return (
        <div className="flex h-screen w-full bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[var(--text-primary)] selection:text-[var(--bg-main)] overflow-hidden transition-colors duration-300">

            {/* Desktop Sidebar */}
            <aside className="w-[260px] flex-shrink-0 bg-[var(--bg-sidebar)] hidden md:flex flex-col z-20 h-full border-r border-[var(--border-color)]">
                {sidebar}
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onSidebarClose}
                            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--bg-sidebar)] z-40 md:hidden flex flex-col shadow-2xl border-r border-[var(--border-color)]"
                        >
                            {sidebar}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 bg-[var(--bg-main)] h-full transition-colors duration-300">
                {children}
            </main>
        </div>
    );
};
