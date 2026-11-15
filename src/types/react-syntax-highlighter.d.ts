declare module "react-syntax-highlighter" {
  import type { ComponentType, ReactNode } from "react";

  export interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, unknown>;
    children: string | ReactNode;
    showLineNumbers?: boolean;
    wrapLongLines?: boolean;
    customStyle?: React.CSSProperties;
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    useInlineStyles?: boolean;
    [key: string]: unknown;
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/one-dark" {
  const style: Record<string, unknown>;
  export default style;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/one-light" {
  const style: Record<string, unknown>;
  export default style;
}
