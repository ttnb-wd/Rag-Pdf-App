import dotenv from 'dotenv';
import { InferenceClient } from '@huggingface/inference';

dotenv.config();

if (!process.env.HF_TOKEN) {
  throw new Error('HF_TOKEN is missing from .env');
}

const client = new InferenceClient(process.env.HF_TOKEN);

const text =
  'RAG systems retrieve relevant document chunks and use them to answer questions.';

try {
  const result = await client.featureExtraction({
    model: 'BAAI/bge-small-en-v1.5',
    inputs: text,
  });

  console.log('✅ Embedding generated successfully!');

  console.log('Embedding type:', Array.isArray(result) ? 'array' : typeof result);

  if (Array.isArray(result)) {
    console.log('Embedding dimensions:', result.length);
    console.log('First 5 values:', result.slice(0, 5));
  } else {
    console.log(result);
  }
} catch (error) {
  console.error('❌ Embedding generation failed:');
  console.error(error.message);
  process.exit(1);
}