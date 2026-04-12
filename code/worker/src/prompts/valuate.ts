interface ValuationPromptInput {
  type: 'REAL_ESTATE' | 'AUTOMOBILE' | 'STOCK';
  name: string;
  address?: string;
  purchasePrice: number;
  purchaseDate?: string;
  metadata?: {
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    lotSize?: string;
    yearBuilt?: number;
    [key: string]: any;
  };
}

export function buildValuationPrompt(input: ValuationPromptInput): string {
  const details: string[] = [];
  details.push(`Asset Type: ${input.type}`);
  details.push(`Name: ${input.name}`);
  if (input.address) details.push(`Address: ${input.address}`);
  details.push(`Purchase Price: $${input.purchasePrice.toLocaleString()}`);
  if (input.purchaseDate) details.push(`Purchase Date: ${input.purchaseDate}`);

  if (input.metadata) {
    for (const [key, value] of Object.entries(input.metadata)) {
      if (value !== null && value !== undefined && value !== '') {
        details.push(`${key}: ${String(value)}`);
      }
    }
  }

  return `You are a financial asset valuation assistant. Based on the asset details below and current market conditions, provide an estimated current market value.

${details.join('\n')}

Consider:
- Comparable market prices for this asset type
- Asset-specific attributes and condition
- Broader economic/market factors relevant to this asset type
- Time elapsed since purchase

Respond with ONLY a JSON object in this exact format:
{
  "estimatedValue": <number>,
  "confidence": "<low|medium|high>",
  "reasoning": "<brief explanation>"
}`;
}
