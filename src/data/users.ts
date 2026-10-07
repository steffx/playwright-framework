// Seeded accounts that exist every time the demo app starts.
export const USERS = {
  standard: { username: 'standard_user', password: 'secret_sauce', firstName: 'Sam' },
  locked: { username: 'locked_user', password: 'secret_sauce', firstName: 'Lou' },
} as const;

export type Credentials = { username: string; password: string };
