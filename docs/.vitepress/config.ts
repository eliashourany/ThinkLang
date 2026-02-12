import { defineConfig } from "vitepress";
import thinklangGrammar from "../../thinklang-vscode/syntaxes/thinklang.tmLanguage.json";

export default defineConfig({
  title: "ThinkLang",
  description: "An AI-native programming language where think is a keyword",
  head: [["link", { rel: "canonical", href: "https://thinklang.dev" }]],
  sitemap: {
    hostname: "https://thinklang.dev",
  },
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/syntax" },
      { text: "Examples", link: "/examples/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/getting-started" },
            { text: "Language Tour", link: "/guide/language-tour" },
          ],
        },
        {
          text: "Language Features",
          items: [
            { text: "Types", link: "/guide/types" },
            { text: "AI Primitives", link: "/guide/ai-primitives" },
            { text: "Context", link: "/guide/context" },
            { text: "Confidence", link: "/guide/confidence" },
            { text: "Guards", link: "/guide/guards" },
            { text: "Match", link: "/guide/match" },
            { text: "Pipeline", link: "/guide/pipeline" },
            { text: "Error Handling", link: "/guide/error-handling" },
          ],
        },
        {
          text: "Developer Tools",
          items: [
            { text: "Library Usage", link: "/guide/library-usage" },
            { text: "Testing", link: "/guide/testing" },
            { text: "Cost Tracking", link: "/guide/cost-tracking" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Syntax", link: "/reference/syntax" },
            { text: "Types", link: "/reference/types" },
            { text: "Runtime API", link: "/reference/runtime-api" },
            { text: "CLI", link: "/reference/cli" },
            { text: "Errors", link: "/reference/errors" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/eliashourany/ThinkLang" },
    ],
  },
  markdown: {
    languages: [
      {
        ...thinklangGrammar,
        name: "thinklang",
        aliases: ["tl"],
      },
    ],
  },
});
