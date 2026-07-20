import Groq from 'groq-sdk';
import { config } from '../../config';
import { AppError } from '../../common/utils/AppError';

export class AnalysisService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey,
    });
  }

  async generateMatchOdds(matchData: any): Promise<any> {
    try {
      const prompt = `
You are an expert sports betting analyst. Based on the following match data, generate betting odds including:
- Asian Handicap (Kèo Châu Á)
- Over/Under (Tài Xỉu)
- 1x2 (Châu Âu)

Provide a detailed analysis explaining why you generated these odds.
Respond strictly with a JSON object in the following format:
{
  "asianHandicap": { "odds": string, "explanation": string },
  "overUnder": { "odds": string, "explanation": string },
  "1x2": { "homeWin": number, "draw": number, "awayWin": number, "explanation": string }
}

Match Data:
${JSON.stringify(matchData, null, 2)}
      `;

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
      });

      const responseContent = chatCompletion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new AppError('Failed to generate odds from Groq API', 500);
      }

      return JSON.parse(responseContent);
    } catch (error: any) {
      console.error('Groq API Error:', error);
      throw new AppError('Error generating match odds', 500);
    }
  }
}
