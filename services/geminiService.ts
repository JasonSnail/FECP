import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DiagnosticLog, Foup } from "../types";

// NOTE: In a real environment, ensure process.env.API_KEY is set.
// For this demo, we assume it is available.
const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const analyzeSystemState = async (
  query: string,
  logs: DiagnosticLog[],
  activeFoups: Foup[]
): Promise<string> => {
  if (!ai) {
    return "Diagnostics unavailable: API Key not configured. Please check environment variables.";
  }

  // Construct a context-rich prompt based on the Agent.md spec
  const context = `
    You are the FECP (Fab Equipment Control Platform) AI Agent.
    
    Current System State:
    - Machine: TEL_LITHIUS_01 (Track)
    - Active FOUPs: ${JSON.stringify(activeFoups.map(f => ({ id: f.id, state: f.state, workflow: f.workflowVersion })))}
    - Recent Logs (Last 5):
    ${logs.slice(0, 5).map(l => `[${l.timestamp}] ${l.level} - ${l.message} (${l.code})`).join('\n')}

    User Query: "${query}"

    Instructions:
    1. Analyze the logs and state to answer the query.
    2. If there is an error code, explain it.
    3. Suggest the next step in the workflow if asked.
    4. Keep the response technical but concise, suitable for a process engineer.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
    });
    
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating diagnostics analysis. Please check network or API quota.";
  }
};

export const generateWorkflowSpec = async (requirement: string): Promise<string> => {
    if (!ai) return "API Key missing.";

    const prompt = `
        Act as the FECP AI Agent.
        Task: Generate a Workflow Spec based on SDD (Spec Driven Development).
        Requirement: ${requirement}
        
        Output Format: YAML
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "";
    } catch (e) {
        return "Failed to generate spec.";
    }
}