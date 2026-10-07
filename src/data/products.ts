// Reference data mirrored from the demo app's seed, used for readable assertions.
export const PRODUCTS = {
  backpack: { id: 1, name: 'Trail Backpack', price: 79.99 },
  tote: { id: 2, name: 'Canvas Tote', price: 24.5 },
  beanie: { id: 3, name: 'Merino Beanie', price: 29.0 },
  jacket: { id: 4, name: 'Rain Shell Jacket', price: 149.0 },
  bottle: { id: 5, name: 'Steel Water Bottle', price: 19.99 },
  headlamp: { id: 6, name: 'Headlamp 400', price: 39.95 }, // out of stock
} as const;
