import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Use the Groq API key directly
    process.env.GROQ_API_KEY = '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';

    const result = streamText({
      model: groq('llama-3.1-8b-instant'), // Using Llama 3.1 8B model from Groq
      messages,
    });

    return result.toDataStreamResponse({
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'none',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
