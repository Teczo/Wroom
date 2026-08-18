/**
 * Vendor names as their owners spell them. `humanise` would render
 * "mongodb-atlas" as "Mongodb atlas", which looks like a typo on screen.
 */
const LABELS: Record<string, string> = {
  azure: 'Azure',
  'mongodb-atlas': 'MongoDB Atlas',
  vercel: 'Vercel',
  render: 'Render',
  auth0: 'Auth0',
  stripe: 'Stripe',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  apple: 'Apple',
  'google-play': 'Google Play',
  namecheap: 'Namecheap',
  other: 'Other',
};

export function vendorLabel(vendor: string): string {
  return LABELS[vendor] ?? vendor;
}
