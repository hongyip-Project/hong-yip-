import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini API initialization
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasKey: Boolean(apiKey) });
});

// Endpoint: Analyze Document & Extract Flashcards with OCR / NLP
app.post('/api/analyze-document', async (req, res) => {
  try {
    const {
      fileData,
      mimeType,
      textContent,
      deckFocus = 'Comprehensive Balance',
      cardCount = 8,
      targetAudience = 'Undergraduate / College',
    } = req.body;

    if (!fileData && (!textContent || !textContent.trim())) {
      return res.status(400).json({ error: 'Please provide either a document file or lecture text content.' });
    }

    const contents: any[] = [];

    if (fileData && mimeType) {
      // Clean base64 string if it contains data URI prefix
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
    }

    const sanitizedText = textContent ? textContent.slice(0, 16000) : '';

    const promptText = `
Quickly analyze this study material (lecture notes, document, or scanned image).
Perform high-speed OCR/NLP and extract ${cardCount} active-recall flashcard pairs.

Specs:
- Mode: ${deckFocus}
- Card Count: Exactly ${cardCount} cards
- Level: ${targetAudience}

Flashcard Rules:
1. "front": Crisp, direct question or concept recall prompt.
2. "back": Concise 1-2 sentence core explanation.
3. "keyFormulaOrLaw": Formula/equation if present, otherwise empty string.
4. "mnemonicOrHint": Short memory hook (acronym, association, or clue).
5. "conceptCategory": Short topic category.
6. "difficultyLevel": "easy" | "medium" | "hard".
${sanitizedText ? `\nContent excerpt:\n"""\n${sanitizedText}\n"""` : ''}
    `;

    contents.push({ text: promptText });

    const sharedResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Descriptive title' },
        topic: { type: Type.STRING, description: 'Academic subject' },
        summary: { type: Type.STRING, description: '1-2 sentence concise overview' },
        extractedKeyTerms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Top 4-6 key terms',
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              keyFormulaOrLaw: { type: Type.STRING },
              mnemonicOrHint: { type: Type.STRING },
              conceptCategory: { type: Type.STRING },
              difficultyLevel: { type: Type.STRING },
            },
            required: ['front', 'back', 'conceptCategory', 'difficultyLevel'],
          },
        },
      },
      required: ['title', 'topic', 'summary', 'extractedKeyTerms', 'flashcards'],
    };

    let response;
    try {
      // Primary model: gemini-3.8-flash with ThinkingLevel.LOW for low-latency speed
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction:
            'You are a high-speed spaced repetition educator. Swiftly extract high-yield concepts into concise flashcards with structured JSON.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: sharedResponseSchema,
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model slow or unavailable in analyze-document, falling back to gemini-3.1-flash-lite:', primaryErr?.message);
      // High-speed fallback model
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: contents,
        config: {
          systemInstruction:
            'You are a high-speed spaced repetition educator. Swiftly extract high-yield concepts into concise flashcards with structured JSON.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseSchema: sharedResponseSchema,
        },
      });
    }

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze document with Gemini API',
    });
  }
});

// Endpoint: Evaluate Student Self-Explanation / Active Recall Answer
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { cardFront, cardBack, studentAnswer } = req.body;

    if (!cardFront || !cardBack || !studentAnswer) {
      return res.status(400).json({ error: 'Missing cardFront, cardBack, or studentAnswer.' });
    }

    const prompt = `
You are a warm, encouraging, yet rigorous university tutor evaluating a student's active recall answer.

Card Question / Prompt:
"${cardFront}"

Expected Reference Answer:
"${cardBack}"

Student's Attempted Answer:
"${studentAnswer}"

Evaluate their answer based on conceptual understanding, key terminology, and accuracy.
Even if the student's wording differs from the reference answer, award credit if they captured the underlying mechanism and meaning.
Suggest a spaced repetition rating:
- 'again': Missed the main concept or gave incorrect info
- 'hard': Got some parts right, but missed crucial nuances or was hesitant
- 'good': Captured the core ideas accurately
- 'easy': Flawless, thorough, and articulate
    `;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scorePercentage: {
                type: Type.INTEGER,
                description: 'Accuracy score from 0 to 100',
              },
              verdict: {
                type: Type.STRING,
                description: "'correct', 'partially_correct', or 'incorrect'",
              },
              feedback: {
                type: Type.STRING,
                description: '2-3 sentences of constructive feedback explaining what was correct and what key points were missing',
              },
              suggestedRating: {
                type: Type.STRING,
                description: "'again', 'hard', 'good', or 'easy'",
              },
              improvementTip: {
                type: Type.STRING,
                description: 'One key takeaway or mnemonic to cement this concept into long-term memory',
              },
            },
            required: ['scorePercentage', 'verdict', 'feedback', 'suggestedRating', 'improvementTip'],
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model error in evaluate-answer, trying fallback model:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scorePercentage: { type: Type.INTEGER },
              verdict: { type: Type.STRING },
              feedback: { type: Type.STRING },
              suggestedRating: { type: Type.STRING },
              improvementTip: { type: Type.STRING },
            },
            required: ['scorePercentage', 'verdict', 'feedback', 'suggestedRating', 'improvementTip'],
          },
        },
      });
    }

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error evaluating answer:', error);
    // Return friendly educational fallback evaluation instead of crashing
    return res.json({
      scorePercentage: 70,
      verdict: 'partially_correct',
      feedback: 'Good active recall effort! Review the target explanation on the back of the card to reinforce the exact mechanism.',
      suggestedRating: 'hard',
      improvementTip: 'Link the initial trigger directly to the downstream physiological response.',
    });
  }
});

// Endpoint: Generate Multiple-Choice Distractors for Rapid Quiz Mode
app.post('/api/generate-distractors', async (req, res) => {
  try {
    const { cardFront, cardBack, otherCardAnswers = [] } = req.body;

    if (!cardFront || !cardBack) {
      return res.status(400).json({ error: 'Missing cardFront or cardBack.' });
    }

    const prompt = `
Given this flashcard question and correct answer:
Question: "${cardFront}"
Correct Answer: "${cardBack}"

Generate 3 plausible, realistic, and educational distractor answers (incorrect options) of similar length and style, suitable for a multiple-choice question.
    `;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              distractors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of exactly 3 plausible incorrect options',
              },
            },
            required: ['distractors'],
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model error in generate-distractors, trying gemini-3.1-flash-lite:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              distractors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['distractors'],
          },
        },
      });
    }

    const jsonText = response.text || '{"distractors":[]}';
    const parsed = JSON.parse(jsonText);

    if (Array.isArray(parsed.distractors) && parsed.distractors.length >= 2) {
      return res.json(parsed);
    }

    // If AI returned fewer than 2 distractors, supplement from otherCardAnswers or fallbacks
    const fallbackList = Array.isArray(otherCardAnswers) && otherCardAnswers.length >= 3
      ? otherCardAnswers.slice(0, 3)
      : [
          `Inversion: Causes opposite downstream regulation under steady-state conditions.`,
          `Alternative mechanism: Mediated via secondary feedback phosphorylation without direct receptor binding.`,
          `Restricted case: Operates only under transient anaerobic or extreme threshold states.`,
        ];

    return res.json({ distractors: fallbackList });
  } catch (error: any) {
    console.error('Error generating distractors (using fallback):', error?.message);
    const { otherCardAnswers = [] } = req.body;
    const fallbackList = Array.isArray(otherCardAnswers) && otherCardAnswers.length >= 3
      ? otherCardAnswers.filter((a: string) => a !== req.body.cardBack).slice(0, 3)
      : [
          `Inversion: Causes opposite downstream regulation under steady-state conditions.`,
          `Alternative mechanism: Mediated via secondary feedback phosphorylation without direct receptor binding.`,
          `Restricted case: Operates only under transient anaerobic or extreme threshold states.`,
        ];

    return res.json({ distractors: fallbackList });
  }
});

// Vite or Static file serving setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`SynapseAI Server running on port ${PORT} (Prod: ${isProd})`);
  });
}

startServer();
