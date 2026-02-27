import React from 'react';

export const markdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-semibold mt-4 mb-3" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="text-base font-semibold mt-3 mb-2" {...props} />,
  p: ({ node, ...props }: any) => <p className="text-foreground leading-relaxed mb-4" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc list-outside space-y-2 mb-4 ml-6" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside space-y-2 mb-4 ml-6" {...props} />,
  li: ({ node, ...props }: any) => <li className="text-foreground" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    const isInline = typeof inline === 'boolean' ? inline : !className;
    if (isInline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-lg">
        <code className={`block bg-muted/50 p-4 text-sm font-mono text-foreground ${className || ''}`} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  table: ({ node, children, ...props }: any) => (
    <div className="my-3 overflow-x-auto rounded-md border">
      <table {...props} className={`w-full border-collapse text-sm ${props.className || ''}`}>{children}</table>
    </div>
  ),
  thead: ({ node, children, ...props }: any) => (
    <thead {...props} className={`bg-muted/30 ${props.className || ''}`}>{children}</thead>
  ),
  th: ({ node, children, ...props }: any) => (
    <th {...props} className={`border bg-muted/40 px-2 py-1 text-left align-top whitespace-normal break-words ${props.className || ''}`}>{children}</th>
  ),
  td: ({ node, children, ...props }: any) => (
    <td {...props} className={`border px-2 py-1 align-top whitespace-normal break-words ${props.className || ''}`}>{children}</td>
  ),
  a: ({ node, ...props }: any) => <a className="text-primary hover:underline" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-6 border-muted" {...props} />,
};

export default markdownComponents;
