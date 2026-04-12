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
  const details: string[] = [
    `Asset Type: ${input.type}`,
    `Name: ${input.name}`,
    `Purchase Price: $${input.purchasePrice.toLocaleString()}`,
    ...(input.address ? [`Address: ${input.address}`] : []),
    ...(input.purchaseDate ? [`Purchase Date: ${input.purchaseDate}`] : []),
  ];

  if (input.metadata) {
    details.push(
      ...Object.entries(input.metadata)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${key}: ${String(value)}`)
    );
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
