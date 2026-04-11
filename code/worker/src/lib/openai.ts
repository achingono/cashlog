import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
});

export default client;
