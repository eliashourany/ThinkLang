// Agentic workflows — multi-turn tool calling with AI

type Report {
  @description("The main findings")
  findings: string
  @description("Key recommendations")
  recommendations: string[]
  @description("Confidence in the analysis, 0.0 to 1.0")
  confidence: float
}

tool fetchData(source: string): string @description("Fetch data from an internal data source") {
  let data = think<string>("Retrieve data from the specified source")
    with context: source
  print data
}

tool analyzeMetrics(data: string): string @description("Analyze numerical metrics and trends in the data") {
  let analysis = think<string>("Analyze the metrics and identify trends")
    with context: data
  print analysis
}

// Run an agent that gathers data, analyzes it, and produces a report
let report = agent<Report>("Analyze our Q4 sales performance and provide recommendations")
  with tools: fetchData, analyzeMetrics
  max turns: 8
  guard {
    confidence: 0.7..1.0
  }
  on_fail: retry(2)

print report.findings
print report.recommendations
