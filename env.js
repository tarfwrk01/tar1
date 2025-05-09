// Load environment variables from .env file

// For web, we rely on process.env
// For native, we need to manually set these
const ENV = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || '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',
  INSTANT_APP_ID: process.env.INSTANT_APP_ID || '84f087af-f6a5-4a5f-acbc-bc4008e3a725',
};

// Expose environment variables to the rest of the app
export default ENV;
