// Working with Confident<T> — unwrap, check confidence

type Category {
  name: string
  subcategory: string
}

let item = "A sleek titanium watch with sapphire crystal display"

let classified = think<Confident<Category>>("Classify this product into a category and subcategory")
  with context: item

print classified
