import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';

import { ChatGroq } from '@langchain/groq';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { SyntheticEmbeddings } from '@langchain/core/utils/testing';

const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

dotenv.config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
});

// ============================================================
// In-Memory Storage
// ============================================================

let globalVectorStore = null;
let uploadedFilesRegistry = [];

// ============================================================
// Environment / Model Configuration
// ============================================================

const MAIN_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const FAST_MODEL =
  process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';

if (!process.env.GROQ_API_KEY) {
  console.warn(
    '[Warning] GROQ_API_KEY is not configured in the backend .env file.'
  );
}

console.log(`[Config] Main model: ${MAIN_MODEL}`);
console.log(`[Config] Fast model: ${FAST_MODEL}`);

// ============================================================
// Helper: Extract Text Based on File Type
// ============================================================

async function extractText(file) {
  const mime = file.mimetype;
  const originalName = file.originalname.toLowerCase();

  if (
    mime === 'application/pdf' ||
    originalName.endsWith('.pdf')
  ) {
    const parsed = await pdfParse(file.buffer);

    return parsed.text;
  }

  if (
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    return result.value;
  }

  if (
    mime === 'text/plain' ||
    mime === 'text/markdown' ||
    originalName.endsWith('.txt') ||
    originalName.endsWith('.md') ||
    originalName.endsWith('.markdown')
  ) {
    return file.buffer.toString('utf-8');
  }

  throw new Error(
    'Unsupported file format. Please upload PDF, DOCX, TXT, or MD.'
  );
}

// ============================================================
// 1. Multi-Format Upload & Vector Pipeline Endpoint
// ============================================================

app.post(
  '/api/upload',
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
        });
      }

      console.log(
        `[Processing] File: ${req.file.originalname}`
      );

      // --------------------------------------------------------
      // Step A: Document Parsing
      // --------------------------------------------------------

      const text = await extractText(req.file);

      if (!text || !text.trim()) {
        return res.status(400).json({
          error:
            'Could not extract readable text from this document.',
        });
      }

      // --------------------------------------------------------
      // Step B: Chunking With Metadata
      // --------------------------------------------------------

      const textSplitter =
        new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

      const docs = await textSplitter.createDocuments(
        [text],
        [
          {
            source: req.file.originalname,
            fileType: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
          },
        ]
      );

      // --------------------------------------------------------
      // Step C & D: Embeddings + Vector Store
      // --------------------------------------------------------
      // NOTE:
      // SyntheticEmbeddings is currently being used for the
      // prototype. We can replace this with a real embedding
      // provider later for production-quality semantic search.

      const embeddings = new SyntheticEmbeddings({
        vectorSize: 1536,
      });

      if (!globalVectorStore) {
        globalVectorStore =
          await MemoryVectorStore.fromDocuments(
            docs,
            embeddings
          );
      } else {
        await globalVectorStore.addDocuments(docs);
      }

      // --------------------------------------------------------
      // Register Uploaded Document
      // --------------------------------------------------------

      const document = {
        id: Date.now().toString(),
        name: req.file.originalname,
        chunksCount: docs.length,
        size:
          (req.file.size / 1024).toFixed(2) + ' KB',
        uploadedAt: new Date().toISOString(),
        status: 'ready',
      };

      uploadedFilesRegistry.push(document);

      console.log(
        `[Indexed] ${document.name} - ${document.chunksCount} chunks`
      );

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      res.json({
        message:
          'Document successfully indexed into RAG Pipeline!',
        file: req.file.originalname,
        totalChunks: docs.length,
        documents: uploadedFilesRegistry,
      });
    } catch (err) {
      console.error(
        'Upload Pipeline Error:',
        err
      );

      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process document.',
      });
    }
  }
);

// ============================================================
// 2. RAG Chat Endpoint
// ============================================================

app.post('/api/chat', async (req, res) => {
  const {
    question,
    selectedModel = 'main',
    systemPrompt =
      'You are a professional AI Assistant. Answer strictly based on retrieved document knowledge.',
    topK = 3,
  } = req.body;

  try {
    // --------------------------------------------------------
    // Validate Question
    // --------------------------------------------------------

    if (
      typeof question !== 'string' ||
      !question.trim()
    ) {
      return res.status(400).json({
        error: 'Question is required.',
      });
    }

    // --------------------------------------------------------
    // Check Vector Store
    // --------------------------------------------------------

    if (!globalVectorStore) {
      return res.status(400).json({
        answer:
          'ကျေးဇူးပြု၍ မေးခွန်းမမေးမီ Document တစ်ခုခု upload တင်ပေးပါရှင်။',
        citations: [],
        usage: null,
      });
    }

    // --------------------------------------------------------
    // Validate Top K
    // --------------------------------------------------------

    const safeTopK = Math.min(
      Math.max(Number(topK) || 3, 1),
      10
    );

    // --------------------------------------------------------
    // Step A: Vector Retrieval
    // --------------------------------------------------------

    const relevantDocs =
      await globalVectorStore.similaritySearch(
        question.trim(),
        safeTopK
      );

    // --------------------------------------------------------
    // Step B: Context & Citations
    // --------------------------------------------------------

    const contextText = relevantDocs
      .map(
        (doc, idx) =>
          `[Source ${idx + 1}: ${doc.metadata.source}]\n${doc.pageContent}`
      )
      .join('\n\n---\n\n');

    const citations = relevantDocs.map(
      (doc, idx) => ({
        citationId: idx + 1,
        source: doc.metadata.source,
        contentSnippet:
          doc.pageContent.length > 200
            ? doc.pageContent.slice(0, 200) + '...'
            : doc.pageContent,
      })
    );

    // --------------------------------------------------------
    // Step C: Select Groq Model
    // --------------------------------------------------------
    //
    // Frontend sends:
    //
    // selectedModel: "main"
    //      -> GROQ_MODEL
    //      -> openai/gpt-oss-120b
    //
    // selectedModel: "fast"
    //      -> GROQ_FAST_MODEL
    //      -> openai/gpt-oss-20b
    //
    // --------------------------------------------------------

    const model =
      selectedModel === 'fast'
        ? FAST_MODEL
        : MAIN_MODEL;

    console.log(
      `[Chat] Model: ${model} | TopK: ${safeTopK}`
    );

    // --------------------------------------------------------
    // Step D: Initialize Groq LLM
    // --------------------------------------------------------

    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model,
      temperature: 0.1,
    });

    // --------------------------------------------------------
    // Step E: Build RAG Prompt
    // --------------------------------------------------------

    const fullPrompt = `${systemPrompt}

Strict Rules:
1. Answer ONLY using the provided context.
2. Do not use outside knowledge.
3. If the answer cannot be found in the context, explicitly state:
"I cannot find this information in the uploaded documents."
4. When using information from a source, include the corresponding citation such as [Source 1].
5. Be clear, accurate, and concise.

Context:

${contextText}

Question:

${question.trim()}

Answer:`;

    // --------------------------------------------------------
    // Step F: Generate AI Response
    // --------------------------------------------------------

    const response = await llm.invoke(fullPrompt);

    const answer =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    // --------------------------------------------------------
    // Step G: Estimate Token Usage
    // --------------------------------------------------------

    const estimatedPromptTokens =
      Math.ceil(fullPrompt.length / 4);

    const estimatedCompletionTokens =
      Math.ceil(answer.length / 4);

    const totalTokens =
      estimatedPromptTokens +
      estimatedCompletionTokens;

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    res.json({
      answer,
      citations,

      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens,
        modelUsed: model,
      },
    });
  } catch (err) {
    console.error(
      'RAG Chat Error:',
      err
    );

    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : 'Failed to generate AI response.',
    });
  }
});

// ============================================================
// 3. Document Library Endpoint
// ============================================================

app.get('/api/documents', (req, res) => {
  res.json({
    documents: uploadedFilesRegistry,
  });
});

// ============================================================
// 4. Health Check Endpoint
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RAG Studio Engine',
    models: {
      main: MAIN_MODEL,
      fast: FAST_MODEL,
    },
    documents: uploadedFilesRegistry.length,
    vectorStoreReady: Boolean(globalVectorStore),
  });
});

// ============================================================
// Start Server
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `RAG Studio Engine running on http://localhost:${PORT}`
  );

  console.log(
    `[Models] Main: ${MAIN_MODEL}`
  );

  console.log(
    `[Models] Fast: ${FAST_MODEL}`
  );
});