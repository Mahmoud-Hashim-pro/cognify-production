import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    const raw = (process.env.GEMINI_API_KEY || '').trim();
    const primaryKey = raw.split(/[,\s]+/)[0]?.trim();
    if (!primaryKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    aiInstance = new GoogleGenAI({ apiKey: primaryKey });
  }
  return aiInstance;
}

const cleanBase64 = (d: string) => typeof d === 'string' ? d.replace(/^data:[^;]+;base64,/, '') : d;

export const geminiService = {
  /**
   * Translates visual sign language from a base64 webcam frame.
   * Model: gemini-2.5-flash
   */
  async translateSign(imageData: string, language: string = "English", level: string = "Basic") {
    try {
      const cleanImg = cleanBase64(imageData);
      const prompt = `You are an advanced Sign Language recognition AI expert, modeled after the Kaggle Sign Language MNIST dataset for alphabet recognition, alongside diverse global sign language datasets (like ArSL and ASL).
      
      Analyze this image frame completely, paying CRITICAL attention to:
      1. Hand shape, orientation, and fingerspelling configurations (especially A-Z letters based on Sign Language MNIST).
      2. Facial expressions (eyebrows, mouth, eyes) which add crucial context and grammar.
      3. Precise orientation and spatial location of the hands.
      
      CONTEXT FOR THIS USER:
      - Target Language Context: ${language}
      - Signer Skill Level: ${level} (If 'Basic', recognize foundational, beginner-level vocabulary. If 'Advanced', look for nuances).

      INSTRUCTIONS:
      1. If the user is fingerspelling (signing a static alphabet letter A-Y), return EXACTLY that single uppercase letter (e.g., "A").
      2. If the user is signing a full word or gesture, return the best translated word in ${language}.
      3. If no hand is clearly visible or no deliberate sign is occurring, respond EXACTLY with [NO_SIGN].
      
      Return ONLY the letter, translated word, or [NO_SIGN]. Do NOT include any markdown formatting, conversational text, or punctuation.`;

      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                data: cleanImg, 
                mimeType: "image/jpeg" 
              } 
            }
          ]
        }
      });

      return response.text?.trim() || "[NO_SIGN]";
    } catch (err) {
      console.error("translateSign error:", err);
      return "[NO_SIGN]";
    }
  },

  /**
   * Enhances and simplifies live captions for deaf accessibility.
   */
  async enhanceCaptions(text: string, language: string = "English") {
    const prompt = `You are an accessibility expert for deaf users. 
    Task: Clean, correct, and simplify the following live transcription.
    Content: "${text}"
    Language: ${language}
    
    Rules:
    1. Simplify complex sentences while keeping the original meaning.
    2. Correct grammar and spelling errors from the speech-to-text engine.
    3. If the language is Arabic, convert informal slang to clear, simple Modern Standard Arabic if necessary for clarity.
    4. Keep the output professional and easy to read.
    5. Return ONLY the enhanced text. No explanations.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }]
      });
      return response.text?.trim() || text;
    } catch (e) {
      console.error("Gemini Enhancement Error:", e);
      return text;
    }
  },

  /**
   * Transcribes audio into text and signs.
   */
  async transcribeAudio(audioData: string, language: string = "English", mimeType: string = "audio/webm") {
    const prompt = `You are an expert transcription assistant. 
    Action: Listen to the audio and transcribe speech into ${language}.
    Context: User is likely deaf or hard of hearing. Clear captions are vital.
    Dialect: If Arabic, prioritize Egyptian dialect.
    Failure Policy: If there is absolute silence or zero recognizable speech, return "[NO_SPEECH]".
    Important: Do not be overly strict. If you hear someone talking even with noise, transcribe it.
    Output: Return ONLY the exact transcription text. No preambles or decorative emojis.`;

    try {
      const cleanAudio = cleanBase64(audioData);
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                data: cleanAudio, 
                mimeType: mimeType 
              } 
            }
          ]
        }
      });

      const responseText = response.text?.trim() || "";
      
      if (responseText.includes("[NO_SPEECH]") && responseText.length < 20) {
        return { text: "", signs: "" };
      }

      let text = responseText;
      let signs = "";

      if (responseText.includes("SIGNS:")) {
        const parts = responseText.split("SIGNS:");
        text = parts[0].trim();
        signs = parts[1].trim();
      } else {
        text = responseText;
      }

      return { text, signs };
    } catch (error) {
      console.error("Gemini Transcription Error:", error);
      throw error;
    }
  },

  /**
   * PRO FEATURE: Generates technical sign language animation instructions (keyframes).
   * This can be used to drive a 3D avatar or complex visual system.
   */
  async generateSignSequence(text: string, language: string = "English") {
    const prompt = `You are a Sign Language Animation Expert for the ${language} sign language.
    Task: Convert the following sentence into a sequence of technical animation instructions for a Virtual Signer.
    
    Sentence: "${text}"
    
    For each word/concept, provide:
    1. Gesture name
    2. Hand shape (e.g., Open Palm, Closed Fist, Index Point)
    3. Motion description (e.g., Circular clockwise on chest, Straight outward from chin)
    4. Facial expression intensity (0.0 to 1.0)
    
    Return the result as a clean JSON array of objects.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }]
      });
      return JSON.parse(response.text?.trim() || "[]");
    } catch (e) {
      console.error("Pro Sequence Generation Error:", e);
      return [];
    }
  },

  /**
   * Refines, translates, and structures any phrase (Arabic or English) into an optimized
   * sequence of simple concept words perfect for the 3D Sign Language Avatar.
   * Simplifies complex grammar, removes auxiliary words, and aligns slang/idioms to standard concepts.
   */
  async optimizeSignScript(text: string, language: string = "English") {
    const prompt = `You are an expert Sign Language Translator. 
    Your task is to take a spoken/written sentence in ${language} and optimize it into a sequence of simple concept words (Sign Language Gloss or tokens) to be signed by a 3D avatar.
    
    Input sentence: "${text}"
    
    Known major gesture keywords:
    - hello, hi, hey, مرحبا, اهلا, سلام, ازيك, HELLO
    - thanks, thank, شكرا, شكرًا, متشكر, THANK
    - yes, ok, okay, نعم, ايوه, تمام, YES
    - no, not, لا, كلا, NO
    - me, i, انا, أنا, ME
    - you, انت, أنت, انتي, YOU
    - love, حب, بحبك, LOVE
    - help, please, مساعدة, ساعدني, HELP
    
    Optimization directives:
    1. Translate the sentence into a simplified conceptual sequence of sign gloss words space-separated.
    2. Keep nouns (e.g. names like "Dimitri" or "Google") as is, as they will be fingerspelled.
    3. Eliminate auxiliary words, articles, prepositions ("in", "to", "at", "في", "على", "من"), and passive conjugation sounds.
    4. Choose words matching the known gesture keywords above whenever possible. E.g. simplify "إضافة إلى شكري لك" to "شكرا", or "هل يمكنك مساعدتي" to "ساعدني".
    5. Reduce verbs to their core imperative or active infinitive state (e.g. "أنا ذاهب" to "أنا ذاهب").
    
    Return ONLY a single line of space-separated optimized words. No quotes, no explanations, no punctuation.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }]
      });
      return response.text?.trim() || text;
    } catch (e) {
      console.error("Optimize Sign Script Error:", e);
      return text;
    }
  },

  /**
   * Answers a direct question from the user concisely.
   */
  async askGeneralQuestion(text: string, language: string = "English") {
    const prompt = `You are a helpful conversational AI assistant.
    The user is using a Sign Language transcription and translation applet. 
    They have input or asked the following question:
    "${text}"
    
    Please provide a very clear, highly informative, yet concise and simple response in ${language}.
    Keep it to 1-3 short sentences. Avoid complex formatting, bullet points, or markdown blocks, so that the answer is highly readable and extremely easy to translate into sign language tokens afterwards.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }]
      });
      return response.text?.trim() || "";
    } catch (e) {
      console.error("Ask General Question Error:", e);
      return "Error generating response from Gemini.";
    }
  },

  /**
   * Generates predictive quick-reply suggestions based on a transcript.
   */
  async generateQuickReplies(text: string, language: string = "English") {
    const prompt = `You are a real-time speech assistant for speech-impaired individuals. 
    Review the following ongoing conversation transcript:
    "${text}"
    
    Task: Suggest exactly 3 or 4 extremely brief, natural, conversational click-to-speak response options in ${language} that this speech-impaired person could tap to say immediately.
    
    Make the replies:
    1. Short (usually 2-5 words e.g., "Yes, that works", "No, thank you", "One minute please").
    2. Highly context-appropriate to what they heard above.
    3. Diverse (at least one agreement/general, one question or clarification, one gentle boundary/next step).
    4. Culturally natural in ${language}.
    
    Return the result as a raw JSON array of strings, for example: ["Yes, please", "Can you explain?", "Let me think about it"]. No markdown block syntax, no comments.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text?.trim() || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Gemini QuickReplies Generation Error:", e);
      return [];
    }
  },
};

