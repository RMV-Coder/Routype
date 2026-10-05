"use client";

import { useRef } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { githubLight } from "@uiw/codemirror-theme-github";
import {
  Bold, Italic, Code, Heading1, Strikethrough, Braces, Quote, Superscript, Subscript, SquareCheck, List, ListOrdered,
  Image as ImageIcon, Link as LinkIcon, Sigma, SquareFunction, Table,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "./button-group";
import { MarkdownView } from "./markdown-view";

type Tool = { label: string; icon: React.ComponentType; run: () => void };

/**
 * Markdown + LaTeX editor with a formatting toolbar and live preview.
 * Supports GitHub-flavoured markdown, inline/display math ($…$, $$…$$) and raw <sub>/<sup>.
 */
export function MarkdownEditor({
  value,
  onChange,
  preserveLineBreaks,
  placeholder = "Write in markdown… Use $x^2$ for inline math and $$…$$ for display math.",
}: {
  value: string;
  onChange: (value: string) => void;
  preserveLineBreaks?: boolean;
  placeholder?: string;
}) {
  const editorRef = useRef<EditorView | null>(null);

  const wrapSelection = (before: string, after: string = before) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.doc.sliceString(from, to);
    view.dispatch({
      changes: { from, to, insert: `${before}${selected}${after}` },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    });
    view.focus();
  };

  const prefixLines = (prefix: string | ((i: number) => string)) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const start = view.state.doc.lineAt(from).from;
    const text = view.state.doc.sliceString(start, to);
    const insert = text.split("\n").map((line, i) => `${typeof prefix === "string" ? prefix : prefix(i)}${line}`).join("\n");
    view.dispatch({ changes: { from: start, to, insert } });
    view.focus();
  };

  const insert = (snippet: string) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({ changes: { from, to, insert: snippet }, selection: { anchor: from + snippet.length } });
    view.focus();
  };

  const groups: Tool[][] = [
    [
      { label: "Bold", icon: Bold, run: () => wrapSelection("**") },
      { label: "Italic", icon: Italic, run: () => wrapSelection("*") },
      { label: "Strikethrough", icon: Strikethrough, run: () => wrapSelection("~~") },
      { label: "Subscript", icon: Subscript, run: () => wrapSelection("<sub>", "</sub>") },
      { label: "Superscript", icon: Superscript, run: () => wrapSelection("<sup>", "</sup>") },
    ],
    [
      { label: "Heading", icon: Heading1, run: () => prefixLines("# ") },
      { label: "Quote", icon: Quote, run: () => prefixLines("> ") },
      { label: "Bulleted list", icon: List, run: () => prefixLines("- ") },
      { label: "Numbered list", icon: ListOrdered, run: () => prefixLines((i) => `${i + 1}. `) },
      { label: "Task", icon: SquareCheck, run: () => prefixLines("- [ ] ") },
    ],
    [
      { label: "Inline code", icon: Code, run: () => wrapSelection("`") },
      { label: "Code block", icon: Braces, run: () => wrapSelection("```\n", "\n```") },
      { label: "Inline math", icon: Sigma, run: () => wrapSelection("$") },
      { label: "Display math", icon: SquareFunction, run: () => wrapSelection("$$\n", "\n$$") },
      { label: "Table", icon: Table, run: () => insert("\n| Column | Column |\n| ------ | ------ |\n| Cell   | Cell   |\n") },
      { label: "Link", icon: LinkIcon, run: () => wrapSelection("[", "](https://)") },
      { label: "Image", icon: ImageIcon, run: () => insert("![alt text](https://)") },
    ],
  ];

  return (
    <Tabs defaultValue="write" className="gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {groups.map((tools, gi) => (
            <ButtonGroup key={gi}>
              {tools.map(({ label, icon: Icon, run }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Button type="button" size="icon" variant="outline" onClick={run} aria-label={label}>
                      <Icon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{label}</p></TooltipContent>
                </Tooltip>
              ))}
            </ButtonGroup>
          ))}
        </div>
      </div>
      <TabsContent value="write">
        <CodeMirror
          value={value}
          minHeight="320px"
          extensions={[markdown(), EditorView.lineWrapping]}
          theme={githubLight}
          placeholder={placeholder}
          onChange={onChange}
          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
          onCreateEditor={(view) => { editorRef.current = view; }}
          className="overflow-hidden rounded-md border text-base"
        />
      </TabsContent>
      <TabsContent value="preview" className="min-h-[320px] rounded-md border p-4">
        {value.trim()
          ? <MarkdownView content={value} preserveLineBreaks={preserveLineBreaks} />
          : <p className="text-muted-foreground italic">Nothing to preview yet…</p>}
      </TabsContent>
    </Tabs>
  );
}
