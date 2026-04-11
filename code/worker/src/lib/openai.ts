import { AzureOpenAI } from 'openai';

const azureOpenAiConfig = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT?.trim() || '',
  apiKey: process.env.AZURE_OPENAI_API_KEY?.trim() || '',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || '',
};

export function getMissingAzureOpenAIConfig(): string[] {
  const missing: string[] = [];
  if (!azureOpenAiConfig.endpoint) missing.push('AZURE_OPENAI_ENDPOINT');
  if (!azureOpenAiConfig.apiKey) missing.push('AZURE_OPENAI_API_KEY');
  if (!azureOpenAiConfig.deployment) missing.push('AZURE_OPENAI_DEPLOYMENT');
  return missing;
}

const client = new AzureOpenAI({
  endpoint: azureOpenAiConfig.endpoint,
  apiKey: azureOpenAiConfig.apiKey,
  apiVersion: azureOpenAiConfig.apiVersion,
  deployment: azureOpenAiConfig.deployment,
});

export default client;
