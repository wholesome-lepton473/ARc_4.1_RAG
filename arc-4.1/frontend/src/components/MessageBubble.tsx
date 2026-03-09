import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Message } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageBubbleProps {
    message: Message;
}

const ReasoningBlock = ({ reasoning }: { reasoning: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isThinking = !reasoning.endsWith('\n\n') && reasoning.length > 0 && reasoning.length < 50;

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--bg-element-hover)] select-none"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="flex items-center gap-2">
                    {isThinking ? 'Thinking...' : 'Thought'}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 pl-4 border-l-2 border-[var(--border-color)] text-sm text-[var(--text-secondary)] font-mono leading-relaxed whitespace-pre-wrap">
                            {reasoning}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="flex justify-end w-full mb-6">
                <div className="max-w-[85%] md:max-w-2xl bg-[var(--bg-element)] text-[var(--text-primary)] px-5 py-3 rounded-3xl text-[15px] leading-relaxed">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full mb-8 justify-start"
        >
            <div className="w-full max-w-3xl space-y-4">

                {/* The Answer */}
                <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] flex items-center justify-center border border-[var(--border-color)]">
                            {/* Arc Logo / Icon */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                        <div className="font-semibold text-sm text-[var(--text-primary)] mb-1">Arc 4.1</div>

                        {/* Thinking / Reasoning Block */}
                        {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}

                        {/* Markdown Content */}
                        <div className="text-[15px] leading-relaxed text-[var(--text-primary)] font-normal">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ ...props }) => <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-lg font-bold mt-5 mb-2.5 first:mt-0" {...props} />,
                                    h3: ({ ...props }) => <h3 className="text-base font-semibold mt-4 mb-2" {...props} />,
                                    ul: ({ ...props }) => <ul className="list-disc list-outside ml-4 space-y-1 my-3 text-[var(--text-secondary)]" {...props} />,
                                    ol: ({ ...props }) => <ol className="list-decimal list-outside ml-4 space-y-1 my-3 text-[var(--text-secondary)]" {...props} />,
                                    li: ({ ...props }) => <li className="pl-1" {...props} />,
                                    p: ({ ...props }) => <p className="mb-4 last:mb-0 leading-7 text-[var(--text-primary)]" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                                    code: ({ className, children, ...props }) => {
                                        const isInline = !className;
                                        return isInline
                                            ? <code className="bg-[var(--bg-element)] px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>{children}</code>
                                            : <div className="my-4 rounded-md overflow-hidden bg-[var(--code-bg)] border border-[var(--border-color)]">
                                                <div className="flex items-center justify-between px-3 py-2 bg-[var(--code-header)] border-b border-[var(--border-color)]">
                                                    <span className="text-xs text-[var(--text-secondary)] font-sans">Code</span>
                                                </div>
                                                <pre className="p-4 overflow-x-auto text-sm text-[var(--text-secondary)] font-mono"><code {...props}>{children}</code></pre>
                                            </div>
                                    },
                                    pre: ({ children }) => <>{children}</>,
                                    a: ({ ...props }) => <a {...props} className="text-blue-400 hover:text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />,

                                    // Table Components
                                    table: ({ ...props }) => (
                                        <div className="my-5 w-full overflow-hidden rounded-lg border border-[var(--border-color)]">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm text-[var(--text-secondary)]" {...props} />
                                            </div>
                                        </div>
                                    ),
                                    thead: ({ ...props }) => <thead className="bg-[var(--bg-element)] text-xs uppercase text-[var(--text-secondary)] font-medium" {...props} />,
                                    tbody: ({ ...props }) => <tbody className="divide-y divide-[var(--border-color)]" {...props} />,
                                    tr: ({ ...props }) => <tr className="bg-[var(--bg-main)] hover:bg-[var(--bg-element)] transition-colors" {...props} />,
                                    th: ({ ...props }) => <th className="px-4 py-3 font-semibold tracking-wider" {...props} />,
                                    td: ({ ...props }) => <td className="px-4 py-3 whitespace-normal leading-relaxed border-r border-[var(--border-color)] last:border-r-0" {...props} />,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>

                            {message.content === '' && !message.reasoning && (
                                <div className="flex items-center gap-1.5 mt-2">
                                    <div className="w-2 h-2 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};
