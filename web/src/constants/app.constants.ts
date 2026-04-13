/** Backend URL. Overridable via VITE_SERVER_URL in .env. */
export const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:5050';
