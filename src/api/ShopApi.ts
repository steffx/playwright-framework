import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import type { Cart, Order, Product } from './types';
import type { NewUser, Shipping } from '../data/factories';
import type { Credentials } from '../data/users';

/**
 * Thin client over Playwright's APIRequestContext.
 * Raw methods return the APIResponse so negative tests can assert on status codes;
 * the helpers below them assert success and return typed bodies for test setup.
 */
export class ShopApi {
  private token?: string;

  constructor(private readonly request: APIRequestContext) {}

  private get headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  setToken(token: string) {
    this.token = token;
  }

  // Raw calls
  register(user: NewUser) {
    return this.request.post('/api/users', { data: user });
  }
  login(creds: Credentials) {
    return this.request.post('/api/auth/login', { data: creds });
  }
  getProducts(params: Record<string, string> = {}) {
    return this.request.get('/api/products', { params });
  }
  getProduct(id: number | string) {
    return this.request.get(`/api/products/${id}`);
  }
  getCart() {
    return this.request.get('/api/cart', { headers: this.headers });
  }
  addToCart(productId: number, quantity = 1) {
    return this.request.post('/api/cart', { headers: this.headers, data: { productId, quantity } });
  }
  removeFromCart(productId: number) {
    return this.request.delete(`/api/cart/${productId}`, { headers: this.headers });
  }
  placeOrder(shipping: Shipping) {
    return this.request.post('/api/orders', { headers: this.headers, data: shipping });
  }
  getOrder(id: string) {
    return this.request.get(`/api/orders/${id}`, { headers: this.headers });
  }

  // Helpers for test setup
  async createUserAndLogin(user: NewUser): Promise<string> {
    await ok(this.register(user), 201);
    const body = await ok<{ token: string }>(this.login(user));
    this.setToken(body.token);
    return body.token;
  }
  async seedCart(items: Array<{ productId: number; quantity?: number }>): Promise<Cart> {
    let cart!: Cart;
    for (const { productId, quantity } of items) cart = await ok<Cart>(this.addToCart(productId, quantity), 201);
    return cart;
  }
  products(params?: Record<string, string>) {
    return ok<Product[]>(this.getProducts(params));
  }
  order(id: string) {
    return ok<Order>(this.getOrder(id));
  }
}

async function ok<T = unknown>(call: Promise<APIResponse>, status = 200): Promise<T> {
  const res = await call;
  expect(res.status(), `${res.url()} → ${await res.text()}`).toBe(status);
  return res.json() as Promise<T>;
}
