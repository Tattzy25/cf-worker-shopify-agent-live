import { GoogleGenAI } from "@google/genai";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

export function createGeminiService(apiKey = process.env.GEMINI_API_KEY) {
  const ai = new GoogleGenAI({ apiKey });

  const streamConversation = async ({
    messages,
    promptType = AppConfig.api.defaultPromptType,
    tools
  }, streamHandlers) => {
    const systemInstruction = getSystemPrompt(promptType);

    // Map Claude's message history structure into Gemini's format
    const geminiMessages = messages.map(msg => {
      let parts = [];
      if (typeof msg.content === 'string') {
        parts = [{ text: msg.content }];
      } else if (Array.isArray(msg.content)) {
        parts = msg.content.map(c => {
          if (c.type === 'text') return { text: c.text };
          if (c.type === 'tool_use') return { functionCall: { name: c.name, args: c.input } };
          if (c.type === 'tool_result') return { 
            functionResponse: { name: c.name, response: typeof c.content === 'string' ? { result: c.content } : c.content } 
          };
          return { text: '' };
        });
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    // Fire up the stream using the active Google model
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: geminiMessages,
      config: {
        systemInstruction,
        tools: tools ? [{ functionDeclarations: tools }] : undefined
      }
    });

    let fullText = "";
    const toolCalls = [];

    // Catch the pieces as they stream in and push them to the frontend
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        if (streamHandlers.onText) streamHandlers.onText(chunk.text);
      }
      
      if (chunk.functionCalls) {
        for (const call of chunk.functionCalls) {
          toolCalls.push(call);
          if (streamHandlers.onToolUse) {
            await streamHandlers.onToolUse({
              type: "tool_use",
              id: call.id || Math.random().toString(36).substring(7),
              name: call.name,
              input: call.args
            });
          }
        }
      }
    }

    // Pack up the final payload exactly how the Shopify route expects it
    const finalMessage = { role: "assistant", content: [] };
    if (fullText) finalMessage.content.push({ type: "text", text: fullText });
    for (const call of toolCalls) {
      finalMessage.content.push({ 
        type: "tool_use", 
        id: call.id || Math.random().toString(36).substring(7), 
        name: call.name, 
        input: call.args 
      });
    }

    if (streamHandlers.onMessage) streamHandlers.onMessage(finalMessage);
    return finalMessage;
  };

  const getSystemPrompt = (promptType) => {
    return systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content;
  };

  return { streamConversation, getSystemPrompt };
}

export default { createGeminiService };