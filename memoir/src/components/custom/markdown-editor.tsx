import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { ButtonGroup } from "./button-group";
import { useRef, useState } from "react";
import { Bold, Italic, Code, Heading1, Strikethrough, Braces, Quote, Superscript, Subscript, SquareCheck, Square, Image, Link, ListOrdered, List , FileSymlink  } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import 'github-markdown-css/github-markdown-light.css';
import { PostActions } from "./post-actions";
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'img', 'a'],
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'title', 'target', 'rel']
  }
};
const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] }
};
export function MarkdownEditor () {
    const [content, setContent] = useState<string>("");
    const editorRef = useRef<EditorView | null>(null);

    const wrapSelection = (before: string, after: string = before) => {
        const view = editorRef.current;
        if(!view) return;
        const { from, to } = view.state.selection.main;
        const selectedText = view.state.doc.sliceString(from, to);
        view.dispatch({
            changes: { from, to, insert: `${before}${selectedText}${after}` }
        });
    };

    const insertLineStart = (prefix: string) => {
        const view = editorRef.current;
        if(!view) return;
        const { from, to } = view.state.selection.main;
        const lines:string[] = [];
        const text = view.state.doc.sliceString(from, to || from);
        text.split("\n").forEach((line) => {
            lines.push(`${prefix}${line}`);
        });
        view.dispatch({
            changes: { from, to, insert: lines.join("\n") },
        })
    };
    
    return (
        <Tabs defaultValue="Write">
        <Card className="m-4">
            <CardHeader>
                <CardTitle>
                    <TabsList>
                        <TabsTrigger value="Write">Write</TabsTrigger>
                        <TabsTrigger value="Preview">Preview</TabsTrigger>
                    </TabsList>
                </CardTitle>
                {/* <CardDescription>Card Description</CardDescription> */}
                <CardAction>
                    

                    <ButtonGroup>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("**")}><Bold/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Bold</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("*")}><Italic/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Italic</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("~~")}><Strikethrough/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Strikethrough</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("`")}><Code/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Inline Code</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("```\n", "\n```")}><Braces/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Block Code</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("~")}><Subscript/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Subscript</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button size={'icon'} variant={'outline'} onClick={()=>wrapSelection("^")}><Superscript/></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Superscript</p>
                            </TooltipContent>
                        </Tooltip>
                    </ButtonGroup>

                    <ButtonGroup>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("> ")}><Quote/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("# ")}><Heading1/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("- [ ] ")}><Square/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("- [x] ")}><SquareCheck/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("[title](https://www.example.com)")}><Image/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("![alt text](image.jpg)")}><Link/></Button>
                    <Button size={'icon'} variant={'outline'} onClick={()=>insertLineStart("[![alt text](image.jpg)](https://www.example.com)")}><FileSymlink/></Button>
                    </ButtonGroup>
                </CardAction>
            </CardHeader>
            <CardContent>
                <TabsContent value="Write">
                    {/* <Textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Write in markdown..."/> */}
                    <CodeMirror 
                        value={content}
                        height="360px"
                        extensions={[markdown()]}
                        theme={githubLight}
                        onChange={(value)=>{setContent(value)}}
                        basicSetup={{
                            lineNumbers:true,
                            highlightActiveLine: true,
                            history: true,
                            foldGutter: true,
                            highlightSpecialChars: true,
                            syntaxHighlighting: true,
                            autocompletion: true,
                            bracketMatching: true,
                            dropCursor: true,
                            drawSelection: true,
                            closeBrackets: true,
                            rectangularSelection: true,
                            highlightActiveLineGutter: true,
                            highlightSelectionMatches: true,
                            closeBracketsKeymap: true,
                            completionKeymap: true,
                            defaultKeymap: true,
                            searchKeymap: true,
                            foldKeymap: true,
                            lintKeymap: true,
                        }}
                        onCreateEditor={(view) => {
                            editorRef.current = view;
                        }}
                        className="border"
                        // onFocus={(editorView) => {
                        //     // optional: blur immediately so it never shows cursor
                        //     editorView.target.blur();
                        // }}
                    />
                </TabsContent>
                <TabsContent value="Preview" className="prose dark:prose-invert max-w-none">{
                    <div className="markdown-body p-4">
                        <MathJaxContext version={3} config={mathJaxConfig}>
                            <MathJax dynamic>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeHighlight]}>
                                    {content || "*Nothing to preview yet...*"}
                                </ReactMarkdown>
                            </MathJax>
                        </MathJaxContext>
                    </div>
            }</TabsContent>
            </CardContent>
            <CardFooter>
                <PostActions/>
            </CardFooter>
        </Card>
        </Tabs>
    );
}
// # Whispers of the Soul

// > *"Some things are meant to be, hence some other things aren't..."*
// >
// > *"Being hopeful while losing hope is painful, acceptance soothes the heart"*