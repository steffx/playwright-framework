import { test, expect } from '../../src/fixtures/api';
import { USERS } from '../../src/data/users';
import { buildUser } from '../../src/data/factories';

test.describe('Auth API', { tag: '@api' }, () => {
  test('login returns a token for valid credentials', { tag: '@smoke' }, async ({ api }) => {
    const res = await api.login(USERS.standard);

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({
      token: expect.stringMatching(/^[0-9a-f-]{36}$/),
      user: { username: USERS.standard.username, firstName: USERS.standard.firstName },
    });
  });

  test('wrong password is 401', async ({ api }) => {
    const res = await api.login({ ...USERS.standard, password: 'wrong' });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'Username and password do not match any user' });
  });

  test('locked user is 403', async ({ api }) => {
    const res = await api.login(USERS.locked);
    expect(res.status()).toBe(403);
  });

  test('registers a new user who can then log in', async ({ api }) => {
    const user = buildUser();
    const created = await api.register(user);
    expect(created.status()).toBe(201);
    expect(await created.json()).toEqual({ username: user.username, firstName: user.firstName });

    expect((await api.login(user)).ok()).toBeTruthy();
  });

  test('duplicate username is 409', async ({ api }) => {
    const res = await api.register(buildUser({ username: USERS.standard.username }));
    expect(res.status()).toBe(409);
  });

  test('protected endpoints reject missing and bogus tokens', async ({ request }) => {
    expect((await request.get('/api/cart')).status()).toBe(401);
    expect((await request.get('/api/cart', { headers: { Authorization: 'Bearer not-a-token' } })).status()).toBe(401);
  });
});
