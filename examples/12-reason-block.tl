// Multi-step reasoning with reason blocks

type InvestmentAnalysis {
  recommendation: string
  riskLevel: string
  expectedReturn: string
  reasoning: string
}

let portfolio = "Tech stocks: 60%, Bonds: 20%, Real estate: 15%, Cash: 5%"
let marketConditions = "Rising interest rates, AI sector booming, housing market cooling"

let analysis = reason<InvestmentAnalysis> {
  goal: "Analyze this investment portfolio and provide recommendations"
  steps:
    1. "Evaluate the current asset allocation"
    2. "Assess market conditions impact on each asset class"
    3. "Identify risks and opportunities"
    4. "Formulate a recommendation"
  with context: {
    portfolio,
    marketConditions,
  }
}

print analysis
