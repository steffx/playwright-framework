// ShopLite: a tiny e-commerce demo app built to be tested.
// In-memory data, REST API + static UI. Restarting the server resets everything.
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PRODUCTS = [
  { id: 1, name: 'Trail Backpack', category: 'bags', price: 79.99, stock: 12, description: '28L daypack with rain cover.' },
  { id: 2, name: 'Canvas Tote', category: 'bags', price: 24.5, stock: 40, description: 'Heavy cotton everyday tote.' },
  { id: 3, name: 'Merino Beanie', category: 'apparel', price: 29.0, stock: 25, description: 'Soft, warm, itch-free.' },
  { id: 4, name: 'Rain Shell Jacket', category: 'apparel', price: 149.0, stock: 6, description: 'Waterproof and packable.' },
  { id: 5, name: 'Steel Water Bottle', category: 'gear', price: 19.99, stock: 100, description: 'Keeps drinks cold for 24h.' },
  { id: 6, name: 'Headlamp 400', category: 'gear', price: 39.95, stock: 0, description: '400 lumen rechargeable headlamp.' },
];

// username -> { username, password, firstName, locked }
const users = new Map([
  ['standard_user', { username: 'standard_user', password: 'secret_sauce', firstName: 'Sam', locked: false }],
  ['locked_user', { username: 'locked_user', password: 'secret_sauce', firstName: 'Lou', locked: true }],
]);
const sessions = new Map(); // token -> username
const carts = new Map(); // username -> [{ productId, quantity }]
const orders = new Map(); // orderId -> order

const findProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));
const round = (n) => Math.round(n * 100) / 100;

function cartView(username) {
  const items = (carts.get(username) || []).map(({ productId, quantity }) => {
    const p = findProduct(productId);
    return { productId, name: p.name, price: p.price, quantity, lineTotal: round(p.price * quantity) };
  });
  const subtotal = round(items.reduce((s, i) => s + i.lineTotal, 0));
  const tax = round(subtotal * 0.08);
  return { items, subtotal, tax, total: round(subtotal + tax) };
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const username = sessions.get(token);
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  req.username = username;
  next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/users', (req, res) => {
  const { username, password, firstName } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
  if (users.has(username)) return res.status(409).json({ error: 'Username already exists' });
  users.set(username, { username, password, firstName: firstName || username, locked: false });
  res.status(201).json({ username, firstName: firstName || username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Username and password do not match any user' });
  }
  if (user.locked) return res.status(403).json({ error: 'Sorry, this user has been locked out' });
  const token = crypto.randomUUID();
  sessions.set(token, username);
  res.json({ token, user: { username, firstName: user.firstName } });
});

app.get('/api/me', auth, (req, res) => {
  const { username, firstName } = users.get(req.username);
  res.json({ username, firstName });
});

app.get('/api/products', (req, res) => {
  const { q = '', category, sort } = req.query;
  let list = PRODUCTS.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
  if (category) list = list.filter((p) => p.category === category);
  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'name-asc': (a, b) => a.name.localeCompare(b.name),
    'name-desc': (a, b) => b.name.localeCompare(a.name),
  };
  if (sort && sorters[sort]) list = [...list].sort(sorters[sort]);
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const p = findProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

app.get('/api/cart', auth, (req, res) => res.json(cartView(req.username)));

app.post('/api/cart', auth, (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  const p = findProduct(productId);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'quantity must be a positive integer' });
  const cart = carts.get(req.username) || [];
  const line = cart.find((i) => i.productId === p.id);
  const newQty = (line ? line.quantity : 0) + quantity;
  if (newQty > p.stock) return res.status(409).json({ error: `Only ${p.stock} left in stock` });
  if (line) line.quantity = newQty;
  else cart.push({ productId: p.id, quantity });
  carts.set(req.username, cart);
  res.status(201).json(cartView(req.username));
});

app.delete('/api/cart/:productId', auth, (req, res) => {
  const cart = (carts.get(req.username) || []).filter((i) => i.productId !== Number(req.params.productId));
  carts.set(req.username, cart);
  res.json(cartView(req.username));
});

app.post('/api/orders', auth, (req, res) => {
  const { firstName, lastName, postalCode } = req.body || {};
  if (!firstName || !lastName || !postalCode) {
    return res.status(400).json({ error: 'firstName, lastName and postalCode are required' });
  }
  const cart = cartView(req.username);
  if (cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  const id = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const order = { id, username: req.username, shipping: { firstName, lastName, postalCode }, ...cart, createdAt: new Date().toISOString() };
  orders.set(id, order);
  carts.set(req.username, []);
  res.status(201).json(order);
});

app.get('/api/orders/:id', auth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order || order.username !== req.username) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Used by the download test.
app.get('/api/export/products.csv', (_req, res) => {
  const rows = ['id,name,category,price', ...PRODUCTS.map((p) => `${p.id},${p.name},${p.category},${p.price}`)];
  res.attachment('products.csv').type('text/csv').send(rows.join('\n'));
});

// Used by the upload test: echoes back what it received (raw body, filename in header).
app.post('/api/upload', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
  res.json({ filename: req.headers['x-filename'], bytes: req.body.length });
});

app.get('/', (_req, res) => res.redirect('/login.html'));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`ShopLite running at http://localhost:${port}`));
