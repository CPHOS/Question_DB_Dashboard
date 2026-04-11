import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { Box } from "@chakra-ui/react"

export default function MarkdownRenderer({ children }: { children: string }) {
    return (
        <Box
            className="md-prose"
            css={{
                "& h1": { fontSize: "1.5em", fontWeight: "bold", mt: "0.8em", mb: "0.4em" },
                "& h2": { fontSize: "1.3em", fontWeight: "bold", mt: "0.8em", mb: "0.4em" },
                "& h3": { fontSize: "1.15em", fontWeight: "bold", mt: "0.6em", mb: "0.3em" },
                "& h4, & h5, & h6": { fontSize: "1em", fontWeight: "bold", mt: "0.5em", mb: "0.2em" },
                "& p": { mb: "0.5em", lineHeight: "1.7" },
                "& ul": { pl: "1.5em", mb: "0.5em", listStyleType: "disc" },
                "& ol": { pl: "1.5em", mb: "0.5em", listStyleType: "decimal" },
                "& li": { mb: "0.2em", lineHeight: "1.7" },
                "& li > ul, & li > ol": { mt: "0.2em" },
                "& blockquote": {
                    borderLeftWidth: "3px",
                    borderLeftColor: "border",
                    pl: "1em",
                    ml: "0",
                    color: "fg.muted",
                    my: "0.5em",
                },
                "& code": {
                    bg: "bg.muted",
                    px: "0.3em",
                    py: "0.1em",
                    borderRadius: "sm",
                    fontSize: "0.9em",
                },
                "& pre": {
                    bg: "bg.muted",
                    p: "0.8em",
                    borderRadius: "md",
                    overflowX: "auto",
                    my: "0.5em",
                },
                "& pre code": { bg: "transparent", p: "0" },
                "& table": {
                    width: "100%",
                    borderCollapse: "collapse",
                    my: "0.5em",
                    fontSize: "0.9em",
                },
                "& th, & td": {
                    borderWidth: "1px",
                    borderColor: "border",
                    px: "0.6em",
                    py: "0.3em",
                    textAlign: "left",
                },
                "& th": { fontWeight: "bold", bg: "bg.muted" },
                "& hr": { my: "1em", borderColor: "border" },
                "& a": { color: "blue.fg", textDecoration: "underline" },
                "& img": { maxWidth: "100%", borderRadius: "md" },
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {children}
            </ReactMarkdown>
        </Box>
    )
}
