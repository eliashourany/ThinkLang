# Agents & Tools

ThinkLang supports agentic workflows where an AI loops through tool calls to accomplish a goal. You declare tools as callable functions and use the `agent` expression to orchestrate the loop.

## Tool Declarations

Tools are functions that the AI agent can call. Declare them with the `tool` keyword:

```thinklang
tool getWeather(city: string): string @description("Get current weather for a city") {
  // tool body — runs when the agent calls this tool
  let data = fetchWeatherAPI(city)
  return data
}
```

### Syntax

```thinklang
tool name(params): returnType @description("...") {
  body
}
```

- **`name`** -- The tool's identifier. The agent references it by name.
- **`params`** -- Typed parameters, just like function parameters. These become the tool's input schema.
- **`returnType`** -- The type of value the tool returns to the agent.
- **`@description("...")`** -- An optional annotation that helps the AI understand when and how to use the tool. Good descriptions are critical for reliable tool use.
- **`body`** -- The statements that execute when the agent invokes the tool.

Tools are registered as callable functions in scope. They are compiled into `defineTool()` calls at runtime, which makes them available for any `agent` expression that references them.

### Example Tools

A tool that searches a knowledge base:

```thinklang
tool searchDocs(query: string): string @description("Search internal documentation for relevant information") {
  let results = lookupIndex(query)
  return results
}
```

A tool that performs a calculation:

```thinklang
tool calculateMortgage(principal: float, rate: float, years: int): string @description("Calculate monthly mortgage payment given principal, annual rate, and term in years") {
  let monthly = principal * (rate / 12) / (1 - (1 + rate / 12) * -1)
  return "Monthly payment: $" + toString(monthly)
}
```

## Agent Expressions

The `agent` expression starts an agentic loop: it sends a prompt to the LLM, the LLM calls tools as needed, results are fed back, and this continues until the LLM produces a final answer.

### Syntax

```thinklang
agent<Type>(prompt)
  with tools: tool1, tool2
  max turns: N
```

- **`<Type>`** -- The expected result type, just like `think<Type>`.
- **`prompt`** -- The prompt string describing what the agent should accomplish.
- **`with tools:`** -- A comma-separated list of tool names the agent can use.
- **`max turns: N`** -- Limits the number of loop iterations for safety. Defaults to 10 if omitted.

### How the Loop Works

1. The prompt is sent to the LLM along with the tool definitions.
2. The LLM either calls one or more tools or returns a final answer.
3. If tools were called, their results are fed back to the LLM.
4. Steps 2--3 repeat until the LLM produces a final answer or the turn limit is reached.
5. The final answer is parsed into the specified `<Type>` and returned.

If the agent reaches the maximum number of turns without producing a final answer, an `AgentMaxTurnsError` is thrown.

### Basic Example

```thinklang
type WeatherReport {
  city: string
  temperature: float
  conditions: string
  recommendation: string
}

tool getWeather(city: string): string @description("Get the current weather for a city") {
  let data = fetchWeatherAPI(city)
  return data
}

let report = agent<WeatherReport>("What is the weather in Tokyo? Give a recommendation for what to wear.")
  with tools: getWeather
  max turns: 5

print report
```

## Full Example

Here is a complete example with multiple tools and an agent that uses them together:

```thinklang
type TripPlan {
  @description("Destination city")
  destination: string
  @description("3-day weather forecast summary")
  weatherSummary: string
  @description("List of recommended places to visit")
  places: string[]
  @description("Estimated daily budget in USD")
  dailyBudget: float
  @description("Packing recommendations based on weather")
  packingList: string[]
}

tool getWeather(city: string): string @description("Get the 3-day weather forecast for a city") {
  let forecast = fetchForecastAPI(city)
  return forecast
}

tool searchPlaces(city: string, interest: string): string @description("Search for popular places to visit in a city, filtered by interest like 'food', 'culture', 'nature'") {
  let results = placesAPI(city, interest)
  return results
}

tool getFlightPrice(origin: string, destination: string): string @description("Get the average round-trip flight price between two cities") {
  let price = flightPriceAPI(origin, destination)
  return price
}

tool getHotelPrice(city: string): string @description("Get the average nightly hotel price for a city") {
  let price = hotelPriceAPI(city)
  return price
}

let plan = agent<TripPlan>("Plan a 3-day trip to Barcelona from New York. I like food and culture. Include weather, places, and budget estimates.")
  with tools: getWeather, searchPlaces, getFlightPrice, getHotelPrice
  max turns: 8

print plan
```

The agent might:
1. Call `getWeather("Barcelona")` to get the forecast.
2. Call `searchPlaces("Barcelona", "food")` and `searchPlaces("Barcelona", "culture")` for recommendations.
3. Call `getFlightPrice("New York", "Barcelona")` and `getHotelPrice("Barcelona")` for budget data.
4. Synthesize everything into a `TripPlan` result.

The exact sequence of tool calls is decided by the AI based on the prompt and available tools.

## Context with Agents

The `with context:` clause works the same way as with `think`. Context is included in the agent's system prompt, giving the AI background information alongside the tools.

### Single variable

```thinklang
let userPreferences = "Vegetarian, budget-conscious, likes museums"

let plan = agent<TripPlan>("Plan a trip to Paris tailored to the user's preferences")
  with tools: getWeather, searchPlaces, getHotelPrice
  with context: userPreferences
  max turns: 6
```

### Context block

```thinklang
let userProfile = "Experienced hiker, prefers outdoor activities"
let budget = "Under $2000 for 5 days"
let dates = "March 15-20"

let plan = agent<TripPlan>("Plan a hiking trip to Colorado")
  with tools: getWeather, searchPlaces, getFlightPrice
  with context: {
    userProfile,
    budget,
    dates,
  }
  max turns: 8
```

Context helps the agent make better decisions about which tools to call and how to interpret the results.

## Guards and Retry

Guards validate the final agent output, just like they do with `think`, `infer`, and `reason`. If the agent's answer does not satisfy the guard, the behavior depends on the `on_fail` clause.

### Guard on agent output

```thinklang
let report = agent<WeatherReport>("Get the weather in London and recommend clothing")
  with tools: getWeather
  max turns: 5
  guard {
    length: 50..1000
    contains_none: ["I don't know", "unavailable"]
  }
```

### Retry the entire agent loop

When `on_fail: retry(n)` is specified, the entire agent loop restarts from scratch if the guard fails:

```thinklang
let report = agent<WeatherReport>("Get the weather in London and recommend clothing")
  with tools: getWeather
  max turns: 5
  guard {
    length: 50..1000
  }
  on_fail: retry(2)
```

This retries the full agent loop up to 2 times with exponential backoff.

### Retry with fallback

If all retries fail, a fallback value is used:

```thinklang
let report = agent<WeatherReport>("Get the weather in London")
  with tools: getWeather
  max turns: 5
  guard {
    length: 50..1000
  }
  on_fail: retry(2) then fallback({
    city: "London",
    temperature: 0.0,
    conditions: "unknown",
    recommendation: "Check weather manually"
  })
```

## Error Handling

Agent-specific errors can be caught with `try`/`catch`:

```thinklang
try {
  let result = agent<Report>("Research this topic")
    with tools: searchDocs
    max turns: 3
} catch AgentMaxTurnsError (e) {
  print "Agent could not finish within the turn limit"
} catch ToolExecutionError (e) {
  print "A tool failed during execution"
}
```

| Error | When it occurs |
|---|---|
| `AgentMaxTurnsError` | The agent reached `max turns` without producing a final answer |
| `ToolExecutionError` | A tool threw an error during execution |
| `GuardFailed` | The final output failed guard validation (and no retry/fallback was configured) |

## Using Agents from the Library API

The agent runtime is also available as a library function in JavaScript/TypeScript:

```typescript
import { agent, defineTool, zodSchema } from "thinklang";
import { z } from "zod";

const getWeather = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city",
  input: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather.example/v1/${city}`);
    return res.text();
  },
});

const WeatherReport = z.object({
  city: z.string(),
  temperature: z.number(),
  conditions: z.string(),
  recommendation: z.string(),
});

const result = await agent<z.infer<typeof WeatherReport>>({
  prompt: "What is the weather in Tokyo?",
  tools: [getWeather],
  ...zodSchema(WeatherReport),
  maxTurns: 5,
});

console.log(result.data);           // the WeatherReport object
console.log(result.turns);          // how many loop iterations it took
console.log(result.toolCallHistory); // full history of tool calls and results
```

## Best Practices

- **Write clear tool descriptions.** The AI relies on the `@description` annotation to decide when and how to use each tool. Be specific about what the tool does, what its inputs mean, and what it returns.
- **Set a reasonable `max turns` limit.** Fewer turns keeps costs down and prevents runaway loops. Start low (3--5) and increase if the task genuinely requires more steps.
- **Provide context for complex goals.** Use `with context:` to give the agent background information that guides its tool-calling strategy.
- **Use guards for output quality.** Validate the final result to ensure the agent produced something useful before using it downstream.
- **Handle errors gracefully.** Catch `AgentMaxTurnsError` for cases where the agent cannot converge, and `ToolExecutionError` for tool failures.
