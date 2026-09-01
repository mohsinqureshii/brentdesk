/**
 * Alt Text Generation Service
 * Uses AI to generate accessible alt text for images
 */

import { invokeLLM } from "../_core/llm";

// ============================================================
// TYPES
// ============================================================

export interface AltTextResult {
  altText: string;
  title: string;
  caption: string;
  confidence: number;
}

export interface GenerateAltTextInput {
  imageUrl: string;
  context?: string; // Optional context about where the image is used
  existingAlt?: string; // Existing alt text to improve
}

// ============================================================
// ALT TEXT SERVICE
// ============================================================

export class AltTextService {
  /**
   * Generate alt text for an image using AI vision
   */
  async generateAltText(input: GenerateAltTextInput): Promise<AltTextResult> {
    const { imageUrl, context, existingAlt } = input;

    const systemPrompt = `You are an expert at writing accessible alt text for images. Your task is to generate:
1. **Alt Text**: A concise, descriptive alt text (max 125 characters) that describes the image content for screen readers
2. **Title**: A brief title for the image (max 60 characters)
3. **Caption**: A longer descriptive caption (max 200 characters) suitable for display below the image

Guidelines for alt text:
- Be specific and concise
- Describe the most important visual information
- Don't start with "Image of" or "Picture of"
- Include relevant text visible in the image
- For people, describe their actions, expressions, or context
- For charts/graphs, describe the data trend or key insight
- For logos, include the company/brand name

${context ? `Context: This image is being used in ${context}` : ''}
${existingAlt ? `Current alt text to improve: "${existingAlt}"` : ''}

Respond in JSON format with these exact fields:
{
  "altText": "string (max 125 chars)",
  "title": "string (max 60 chars)",
  "caption": "string (max 200 chars)",
  "confidence": number (0-1, how confident you are in the description)
}`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "auto"
                }
              },
              {
                type: "text",
                text: "Please analyze this image and generate accessible alt text, title, and caption."
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "alt_text_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                altText: { 
                  type: "string", 
                  description: "Concise alt text for screen readers (max 125 chars)" 
                },
                title: { 
                  type: "string", 
                  description: "Brief title for the image (max 60 chars)" 
                },
                caption: { 
                  type: "string", 
                  description: "Longer descriptive caption (max 200 chars)" 
                },
                confidence: { 
                  type: "number", 
                  description: "Confidence score from 0 to 1" 
                }
              },
              required: ["altText", "title", "caption", "confidence"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Unexpected response format from LLM');
      }

      const result = JSON.parse(content) as AltTextResult;

      // Ensure character limits
      return {
        altText: result.altText.slice(0, 125),
        title: result.title.slice(0, 60),
        caption: result.caption.slice(0, 200),
        confidence: Math.min(1, Math.max(0, result.confidence))
      };
    } catch (error) {
      console.error('Alt text generation failed:', error);
      // Return fallback values
      return {
        altText: 'Image',
        title: 'Uploaded image',
        caption: '',
        confidence: 0
      };
    }
  }

  /**
   * Batch generate alt text for multiple images
   */
  async generateBatchAltText(
    images: Array<{ id: number; url: string; context?: string }>
  ): Promise<Map<number, AltTextResult>> {
    const results = new Map<number, AltTextResult>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks: typeof images[] = [];
    
    for (let i = 0; i < images.length; i += concurrencyLimit) {
      chunks.push(images.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (image) => {
        const result = await this.generateAltText({
          imageUrl: image.url,
          context: image.context
        });
        results.set(image.id, result);
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Suggest improvements for existing alt text
   */
  async improveAltText(
    imageUrl: string,
    currentAltText: string
  ): Promise<AltTextResult> {
    return this.generateAltText({
      imageUrl,
      existingAlt: currentAltText
    });
  }
}

// Export singleton instance
export const altTextService = new AltTextService();
