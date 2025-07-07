// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    // Set CORS headers so the browser can access the response
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the OpenAI API key from environment variables (never expose this to the browser)
    const apiKey = env.OPENAI_API_KEY;
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    // Parse the incoming request body
    let userInput;
    try {
      userInput = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: "Invalid request body." } }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Always include a system prompt to restrict the assistant
    const systemPrompt = {
      role: "system",
      content:
        "You are a helpful assistant for L'Oréal. Only answer questions about L'Oréal products and skincare routines. If asked about anything else, politely explain you can only discuss L'Oréal products and skincare.",
    };

    // Ensure the system prompt is always the first message
    let messages = userInput.messages || [];
    if (!messages.length || messages[0].role !== "system") {
      messages = [systemPrompt, ...messages];
    } else {
      messages[0] = systemPrompt;
    }

    // Prepare the request body for OpenAI
    const requestBody = {
      model: "gpt-4o",
      messages: messages,
      max_tokens: 300,
    };

    try {
      // Send the request to OpenAI
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // If OpenAI returns an error, forward it
      if (!response.ok) {
        const errorData = await response.json();
        return new Response(
          JSON.stringify({
            error: errorData.error || { message: "OpenAI API error." },
          }),
          { status: response.status, headers: corsHeaders }
        );
      }

      // Return the OpenAI response
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
      // Catch network or unexpected errors
      return new Response(
        JSON.stringify({
          error: { message: "Failed to connect to OpenAI API." },
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
