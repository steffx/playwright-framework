export interface Product {
  id: number;
  name: string;
  category: 'bags' | 'apparel' | 'gear';
  price: number;
  stock: number;
  description: string;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Order extends Cart {
  id: string;
  username: string;
  shipping: { firstName: string; lastName: string; postalCode: string };
  createdAt: string;
}
