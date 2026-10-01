import dotenv from 'dotenv';
import pg from 'pg';
import { InferenceClient } from '@huggingface/inference';

dotenv.config();

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from .env');
}

if (!process.env.HF_TOKEN) {
  throw new Error('HF_TOKEN is missing from .env');
}

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const hf = new InferenceClient(process.env.HF_TOKEN);

const EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5';

async function createEmbedding(text) {
  const result = await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: text,
  });

  if (!Array.isArray(result)) {
    throw new Error('Embedding response is not an array.');
  }

  return result;
}

async function main() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');

    await db.connect();

    // --------------------------------------------------
    // 1. Create a test document
    // --------------------------------------------------

    console.log('📄 Creating test document...');

    const documentResult = await db.query(
      `
      INSERT INTO documents (
        name,
        file_type,
        file_size,
        chunks_count,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING id, name;
      `,
      [
        'test-vector-document.txt',
        'text/plain',
        100,
        1,
        'ready',
      ]
    );

    const document = documentResult.rows[0];

    console.log('✅ Test document created!');
    console.log(document);

    // --------------------------------------------------
    // 2. Create real embedding
    // --------------------------------------------------

    console.log('🧠 Creating real embedding...');

    const testText =
      'RAG systems retrieve relevant document chunks and use them to answer questions.';

    const embedding = await createEmbedding(testText);

    console.log(
      `✅ Embedding created: ${embedding.length} dimensions`
    );

    const embeddingString = `[${embedding.join(',')}]`;

    // --------------------------------------------------
    // 3. Insert vector into document_chunks
    // --------------------------------------------------

    console.log('💾 Inserting vector into PostgreSQL...');

    const insertResult = await db.query(
      `
      INSERT INTO document_chunks (
        document_id,
        content,
        chunk_index,
        embedding,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::vector,
        $5::jsonb
      )
      RETURNING id, document_id, chunk_index;
      `,
      [
        document.id,
        testText,
        0,
        embeddingString,
        JSON.stringify({
          source: 'test-vector-db',
          test: true,
        }),
      ]
    );

    console.log('✅ Vector inserted successfully!');
    console.log(insertResult.rows[0]);

    // --------------------------------------------------
    // 4. Create query embedding
    // --------------------------------------------------

    console.log('🔎 Creating query embedding...');

    const searchText =
      'How does a RAG system find information from documents?';

    const queryEmbedding = await createEmbedding(searchText);

    const queryEmbeddingString =
      `[${queryEmbedding.join(',')}]`;

    // --------------------------------------------------
    // 5. Similarity search
    // --------------------------------------------------

    console.log('🔍 Running pgvector similarity search...');

    const searchResult = await db.query(
      `
      SELECT
        dc.id,
        dc.content,
        dc.chunk_index,
        dc.metadata,
        d.name AS document_name,
        1 - (dc.embedding <=> $1::vector) AS similarity
      FROM document_chunks dc
      INNER JOIN documents d
        ON d.id = dc.document_id
      WHERE dc.document_id = $2
      ORDER BY dc.embedding <=> $1::vector
      LIMIT 3;
      `,
      [
        queryEmbeddingString,
        document.id,
      ]
    );

    console.log('✅ Similarity search successful!');

    console.dir(searchResult.rows, {
      depth: null,
    });

    // --------------------------------------------------
    // 6. Cleanup test data
    // --------------------------------------------------

    console.log('🧹 Cleaning up test data...');

    await db.query(
      `
      DELETE FROM documents
      WHERE id = $1;
      `,
      [document.id]
    );

    console.log('✅ Test data removed.');

    await db.end();

    console.log(
      '\n🎉 PostgreSQL + pgvector end-to-end test PASSED!'
    );

    console.log(`
Pipeline verified:

Document
   ↓
Real Embedding (384 dimensions)
   ↓
PostgreSQL
   ↓
pgvector
   ↓
Cosine Similarity Search
   ↓
Relevant Chunk
`);
  } catch (error) {
    console.error(
      '\n❌ Vector database test failed:'
    );

    console.error(error);

    try {
      await db.end();
    } catch {}

    process.exit(1);
  }
}

main();