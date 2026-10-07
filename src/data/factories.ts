import { faker } from '@faker-js/faker';

export type NewUser = { username: string; password: string; firstName: string };
export type Shipping = { firstName: string; lastName: string; postalCode: string };

// Unique per call, so parallel workers never fight over the same account or cart.
export function buildUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    username: `user_${faker.string.alphanumeric(10).toLowerCase()}`,
    password: faker.internet.password({ length: 12 }),
    firstName: faker.person.firstName(),
    ...overrides,
  };
}

export function buildShipping(overrides: Partial<Shipping> = {}): Shipping {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    postalCode: faker.string.numeric(5),
    ...overrides,
  };
}
