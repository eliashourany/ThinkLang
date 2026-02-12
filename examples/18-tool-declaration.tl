// Tool declarations — define capabilities for AI agents

type SearchResult {
  title: string
  snippet: string
  relevance: float
}

// Define a tool that the agent can call
tool searchDocs(query: string): string @description("Search internal documentation for relevant information") {
  let result = think<string>("Find the most relevant documentation snippet")
    with context: query
  print result
}

tool summarize(text: string): string @description("Summarize a long text into key points") {
  let summary = think<string>("Summarize the following text into 2-3 key points")
    with context: text
  print summary
}

// Use an agent with tools — the AI decides which tools to call
let answer = agent<string>("What are the main features of ThinkLang?")
  with tools: searchDocs, summarize
  max turns: 5

print answer
