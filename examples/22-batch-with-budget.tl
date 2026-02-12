// Example 22: Batch Processing with Cost Budget
// Process items but stop if cost exceeds a threshold

type Category {
  @description("The category this item belongs to")
  name: string
  @description("Confidence in the classification")
  confidence: float
}

let items = ["laptop", "banana", "novel", "hammer", "yogurt", "painting", "screwdriver", "apple", "sculpture", "wrench"]

// Classify items with a cost budget — stops early if budget exceeded
let categories = map_think<Category>(items, "Classify this item into a product category")
  concurrency: 5
  cost_budget: 0.50

print categories
