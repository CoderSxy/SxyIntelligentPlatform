"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function InkosMarkdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`inkos-markdown prose prose-invert max-w-none text-sm leading-7 text-slate-300 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-slate-100">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-5 text-xl font-semibold text-slate-100">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-200">{children}</h3>,
          p: ({ children }) => <p className="mb-3">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-amber-500/50 pl-4 text-slate-400">{children}</blockquote>
          ),
          code: ({ children, className: codeClass }) =>
            codeClass ? (
              <code className="block overflow-x-auto rounded-md bg-[#05090b] p-3 text-xs text-slate-300">{children}</code>
            ) : (
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-amber-200">{children}</code>
            ),
          pre: ({ children }) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
          hr: () => <hr className="my-6 border-slate-800" />,
          strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
          em: ({ children }) => <em className="text-slate-400">{children}</em>
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
