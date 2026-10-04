"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import "github-markdown-css/github-markdown-light.css";

// Raw HTML is allowed (e.g. <sup>, <sub>, <kbd>) but sanitized *before* KaTeX runs,
// so math output is trusted while user HTML cannot inject scripts or handlers.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./, "math-inline", "math-display"]],
  },
};

/**
 * Renders a piece: GitHub-flavoured markdown (tables, task lists, strikethrough),
 * LaTeX math ($inline$ and $$display$$) and syntax-highlighted code.
 * `preserveLineBreaks` keeps single line breaks, which poems and haiku rely on.
 */
export function MarkdownView({
  content,
  preserveLineBreaks = false,
  className,
}: {
  content: string;
  preserveLineBreaks?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("markdown-body piece", className)}>
      <ReactMarkdown
        remarkPlugins={preserveLineBreaks ? [remarkGfm, remarkMath, remarkBreaks] : [remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeKatex, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Piece kinds whose single line breaks are meaningful. */
export const LINE_BREAK_KINDS = new Set(["poetry", "phrase", "riddle", "diary", "thought"]);
