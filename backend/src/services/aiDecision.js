const openai = require("./openai");

async function askDecision(prompt, userMessage) {
  const response = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",

    max_tokens: 20,

    temperature: 0,

    messages: [
      {
        role: "system",
        content:
          "You are a decision engine. Return exactly one word: YES or NO. Nothing else.",
      },
      {
        role: "user",
        content: `
Decision Question:
${prompt}

User Message:
${userMessage}

Return only YES or NO.
        `,
      },
    ],
  });

  console.log(
    "AI Response:",
    JSON.stringify(response, null, 2)
  );

  const message = response?.choices?.[0]?.message;

  const content = message?.content;

  if (!content) {
    console.error(
      "AI message has no content:",
      message
    );

    throw new Error(
      "AI returned no text content"
    );
  }

  const result = content
    .trim()
    .toUpperCase();

  console.log("AI Decision:", result);

  if (result !== "YES" && result !== "NO") {
    throw new Error(
      `Invalid AI decision: ${result}`
    );
  }

  return result;
}

module.exports = {
  askDecision,
};