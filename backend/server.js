import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';
import pg from 'pg';
import { ChatGroq } from '@langchain/groq';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { InferenceClient } from '@huggingface/inference';

const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

dotenv.config();

const { Pool } = pg;

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
});

// ======================================================
// Environment Configuration
// ======================================================

const PORT = process.env.PORT || 5000;

const MAIN_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const FAST_MODEL =
  process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';

const EMBEDDING_MODEL =
  'BAAI/bge-small-en-v1.5';

const EMBEDDING_DIMENSIONS = 384;

// ======================================================
// RAG Retrieval Settings
// ======================================================

const RAG_SEARCH_LIMIT = 30;

const DATASET_SEARCH_LIMIT = 40;

const EXPLICIT_DOCUMENT_SEARCH_LIMIT = 20;

const MIN_SIMILARITY = 0.55;

const MIN_EVIDENCE_SCORE = 0.35;

// Explicit document identity boost.
const DOCUMENT_IDENTITY_WEIGHT = 0.25;

// Dataset direct-evidence boost.
const DATASET_EVIDENCE_WEIGHT = 0.30;

// Dataset directness boost.
const DATASET_DIRECTNESS_WEIGHT = 0.20;

// ======================================================
// Evidence Patterns
// ======================================================

const DIRECT_EVIDENCE_PATTERNS = [
  /\baccording to\b/i,

  /\bwe (used|use|conducted|performed|evaluated|tested|trained|collected)\b/i,

  /\bour (study|experiments?|method|results?|dataset|model)\b/i,

  /\bthe (study|experiments?|authors?|researchers?|dataset|model)\b/i,

  /\bwas (used|obtained|collected|conducted|performed|trained|evaluated)\b/i,

  /\bwere (used|obtained|collected|conducted|performed|trained|evaluated)\b/i,

  /\bconsists? of\b/i,

  /\bcontains?\b/i,

  /\bincludes?\b/i,

  /\bcomprised? of\b/i,

  /\bexperiments? (were|was|have been|has been)\b/i,

  /\bresults? (show|showed|indicate|indicated)\b/i,

  /\bwe (found|observed|achieved|obtained|reported)\b/i,
];

const INDIRECT_EVIDENCE_PATTERNS = [
  /\brelated work\b/i,

  /\bprevious work\b/i,

  /\bprior work\b/i,

  /\bsimilar work\b/i,

  /\bsimilar dataset\b/i,

  /\bsame dataset\b/i,

  /\bother studies\b/i,

  /\bother researchers\b/i,

  /\bfor example\b/i,

  /\be\.g\.\b/i,

  /\bref\.\s*\[\d+\]/i,

  /\breference\b/i,

  /\bcompared with\b/i,

  /\bcompared to\b/i,

  /\bpreviously\b/i,
];

// ======================================================
// Dataset-specific Evidence Patterns
// IMPORTANT:
// These patterns are checked against RAW text.
// Do not normalize punctuation before testing them.
// ======================================================

// Strong current-study dataset usage.
const DATASET_CURRENT_STUDY_PATTERNS = [
  /\b(?:our|this|the)\s+(?:study|research|experiments?)\b[\s\S]{0,180}\b(?:used|utilized|employed)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i,

  /\bwe\b[\s\S]{0,100}\b(?:used|utilized|employed)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i,

  /\b(?:experiments?|experimental\s+(?:study|setup))\b[\s\S]{0,180}\b(?:conducted|performed|carried\s+out)\b[\s\S]{0,140}\b(?:on|using|with)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:was|were)\s+(?:used|employed|utilized)\b[\s\S]{0,160}\b(?:in|for|by)\s+(?:this|our|the)\s+(?:study|research|experiments?)\b/i,

  /\b(?:model|network|classifier)\b[\s\S]{0,160}\b(?:trained|tested|evaluated|validated)\b[\s\S]{0,160}\b(?:on|using|with)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i,
];

// Dataset acquisition / source.
const DATASET_ACQUISITION_PATTERNS = [
  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:was|were|is|are)?\s*(?:obtained|collected|downloaded|acquired|retrieved|taken)\b/i,

  /\b(?:obtained|collected|downloaded|acquired|retrieved|taken)\b[\s\S]{0,180}\b(?:from|using)\b[\s\S]{0,180}\b(?:kaggle|dataset|data\s*set)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:obtained|collected|downloaded|acquired)\b[\s\S]{0,180}\bfrom\s+(?:the\s+)?kaggle\b/i,

  /\b(?:data|images?|samples?)\b[\s\S]{0,180}\b(?:obtained|collected|downloaded|acquired|retrieved)\b[\s\S]{0,180}\b(?:from|using)\b/i,

  /\b(?:obtained|collected|downloaded|acquired)\b[\s\S]{0,180}\bfrom\s+(?:the\s+)?(?:kaggle|website|repository|database)\b/i,
];

// Data loading / training / testing / validation.
const DATASET_EXPERIMENT_PATTERNS = [
  /\bdata\s+loading\b/i,

  /\b(?:load|loaded|loading)\b[\s\S]{0,140}\b(?:the\s+)?(?:dataset|data\s*set|data|images?|samples?)\b/i,

  /\b(?:training|testing|test|validation)\b[\s\S]{0,180}\b(?:dataset|data\s*set|images?|samples?)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:training|testing|test|validation)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:classification|segmentation|model\s+development|experiments?)\b/i,

  /\b(?:training|testing|validation)\s+(?:set|data|dataset)\b/i,

  /\b(?:trained|tested|evaluated|validated)\b[\s\S]{0,160}\b(?:on|using|with)\b[\s\S]{0,160}\b(?:dataset|data\s*set)\b/i,
];

// Dataset description.
const DATASET_DESCRIPTION_PATTERNS = [
  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:consists?|contains?|includes?|comprises?)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:images?|samples?|cases?|patients?|records?)\b/i,

  /\b(?:materials?\s+and\s+methods?|methods?|methodology)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i,

  /\b\d+(?:\.\d+)*\s+(?:dataset|data\s*set|data\s+loading)\b/i,
];

// Phrases that usually indicate another study / related work.
const DATASET_INDIRECT_PATTERNS = [
  /\brelated work\b/i,

  /\bprevious work\b/i,

  /\bprior work\b/i,

  /\bsimilar work\b/i,

  /\bsimilar dataset\b/i,

  /\bsame dataset\b/i,

  /\bother studies\b/i,

  /\bprevious studies\b/i,

  /\bprevious researchers\b/i,

  /\bother researchers\b/i,

  /\banother\s+(?:study|paper|research)\b/i,

  /\bcompar(?:e|ed|ison)\b[\s\S]{0,100}\b(?:dataset|data\s*set)\b/i,

  /\breferences?\b/i,

  /\bbibliography\b/i,

  /\bfor example\b/i,

  /\be\.g\.\b/i,

  /\breference\b/i,

  /\bref\.\s*\[\d+\]/i,

  /\bcompared with\b/i,

  /\bcompared to\b/i,

  /\bpreviously\b/i,
];

// Strong markers that a dataset clearly belongs to another / previous /
// comparison study or to references. Datasets appearing only in these
// contexts must NOT outrank direct current-study dataset evidence.
const DATASET_STRONG_INDIRECT_PATTERNS = [
  /\brelated work\b/i,

  /\bprevious work\b/i,

  /\bprior work\b/i,

  /\bsimilar dataset\b/i,

  /\bsame dataset\b/i,

  /\bother studies\b/i,

  /\bprevious studies\b/i,

  /\bprevious researchers\b/i,

  /\bother researchers\b/i,

  /\banother\s+(?:study|paper|research)\b/i,

  /\bcompar(?:e|ed|ison)\b[\s\S]{0,100}\b(?:dataset|data\s*set)\b/i,

  /\breferences?\b/i,

  /\bbibliography\b/i,

  /\bref\.\s*\[\d+\]/i,

  // CRITICAL: Development/analysis of a dataset is NOT the same as using it.
  /\bdevelopment\b[\s\S]{0,200}\b(?:of|and\s+analysis\s+of)\b[\s\S]{0,200}\b(?:dataset|data\s*set)\b/i,

  /\banalysis\s+of\b[\s\S]{0,200}\b(?:dataset|data\s*set)\b/i,

  /\b(?:dataset|data\s*set)\b[\s\S]{0,200}\b(?:development|analysis)\b/i,
];

// ======================================================
// Exact RAG Fallback
// ======================================================

const FALLBACK_ANSWER =
  'I cannot find enough information in the uploaded documents.';

// ======================================================
// Environment Validation
// ======================================================

if (!process.env.GROQ_API_KEY) {
  console.warn(
    '[Warning] GROQ_API_KEY is not configured.'
  );
}

if (!process.env.DATABASE_URL) {
  console.error(
    '[Error] DATABASE_URL is not configured.'
  );
}

if (!process.env.HF_TOKEN) {
  console.error(
    '[Error] HF_TOKEN is not configured.'
  );
}

console.log(
  `[Config] Main model: ${MAIN_MODEL}`
);

console.log(
  `[Config] Fast model: ${FAST_MODEL}`
);

console.log(
  `[Config] Embedding model: ${EMBEDDING_MODEL}`
);

console.log(
  `[Config] Embedding dimensions: ${EMBEDDING_DIMENSIONS}`
);

console.log(
  `[RAG] Search candidates: ${RAG_SEARCH_LIMIT}`
);

console.log(
  `[RAG] Dataset candidates: ${DATASET_SEARCH_LIMIT}`
);

console.log(
  `[RAG] Minimum similarity: ${MIN_SIMILARITY}`
);

console.log(
  `[RAG] Minimum evidence score: ${MIN_EVIDENCE_SCORE}`
);

console.log(
  `[RAG] Document identity weight: ${DOCUMENT_IDENTITY_WEIGHT}`
);

console.log(
  `[RAG] Dataset evidence weight: ${DATASET_EVIDENCE_WEIGHT}`
);

console.log(
  `[RAG] Dataset directness weight: ${DATASET_DIRECTNESS_WEIGHT}`
);

// ======================================================
// Database Setup
// ======================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (error) => {
  console.error(
    '[PostgreSQL] Unexpected pool error:',
    error
  );
});

// ======================================================
// Hugging Face
// ======================================================

const hf = new InferenceClient(
  process.env.HF_TOKEN
);

// ======================================================
// Helper: Create Embedding
// ======================================================

async function createEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error(
      'Cannot create embedding for empty text.'
    );
  }

  const result = await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: text,
  });

  if (!Array.isArray(result)) {
    throw new Error(
      'Embedding provider returned an invalid response.'
    );
  }

  if (result.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimensions: ${result.length}. Expected ${EMBEDDING_DIMENSIONS}.`
    );
  }

  return result;
}

// ======================================================
// Helper: Convert Embedding to pgvector Format
// ======================================================

function embeddingToVector(embedding) {
  return `[${embedding.join(',')}]`;
}

// ======================================================
// Helper: Extract Text
// ======================================================

async function extractText(file) {
  const mime = file.mimetype;

  const originalName =
    file.originalname.toLowerCase();

  if (
    mime === 'application/pdf' ||
    originalName.endsWith('.pdf')
  ) {
    const parsed =
      await pdfParse(file.buffer);

    return parsed.text;
  }

  if (
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalName.endsWith('.docx')
  ) {
    const result =
      await mammoth.extractRawText({
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

// ======================================================
// Helper: Detect Reference / Bibliography Content
// ======================================================

function isReferenceChunk(content) {
  const text =
    String(content || '').trim();

  if (!text) {
    return false;
  }

  const normalized =
    text.toLowerCase();

  const numberedReferences =
    text.match(/\[\d+\]/g) || [];

  const hasDoi =
    normalized.includes('doi:') ||
    normalized.includes('doi ');

  const hasBibliographicMetadata =
    normalized.includes('vol.') ||
    normalized.includes('volume ') ||
    normalized.includes('pp.') ||
    normalized.includes('pages ') ||
    normalized.includes('journal ') ||
    normalized.includes('available:') ||
    normalized.includes('accessed:') ||
    normalized.includes('publisher:') ||
    normalized.includes('issn');

  const hasReferenceHeading =
    normalized.includes('references') ||
    normalized.includes('bibliography') ||
    normalized.includes('reference list');

  const urlMatches =
    text.match(/https?:\/\/\S+/gi) || [];

  const hasManyUrls =
    urlMatches.length >= 2;

  const looksLikeReferences =
    hasReferenceHeading &&
    (
      hasDoi ||
      numberedReferences.length >= 2 ||
      hasBibliographicMetadata
    );

  const looksLikeDenseBibliography =
    numberedReferences.length >= 4 &&
    (
      hasDoi ||
      hasBibliographicMetadata ||
      hasManyUrls
    );

  const looksLikeUrlBibliography =
    hasManyUrls &&
    numberedReferences.length >= 2;

  return (
    looksLikeReferences ||
    looksLikeDenseBibliography ||
    looksLikeUrlBibliography
  );
}

// ======================================================
// Evidence Ranking Helpers
// ======================================================

function normalizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(
      /[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/gi,
      ' '
    )
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeRetrievalText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.pdf\b/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'how',
  'in',
  'into',
  'is',
  'it',
  'its',
  'may',
  'of',
  'on',
  'or',
  'should',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'those',
  'to',
  'used',
  'use',
  'using',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'would',
]);

function getMeaningfulQuestionTerms(question) {
  const words =
    normalizeWords(question);

  return [
    ...new Set(
      words.filter(
        (word) =>
          word.length >= 3 &&
          !STOP_WORDS.has(word)
      )
    ),
  ];
}

function calculateLexicalOverlap(
  question,
  content
) {
  const questionTerms =
    getMeaningfulQuestionTerms(question);

  if (
    questionTerms.length === 0
  ) {
    return 0;
  }

  const contentWords =
    new Set(
      normalizeWords(content)
    );

  const matchedTerms =
    questionTerms.filter(
      (term) =>
        contentWords.has(term)
    );

  return (
    matchedTerms.length /
    questionTerms.length
  );
}

function calculatePhraseOverlap(
  question,
  content
) {
  const questionTerms =
    getMeaningfulQuestionTerms(question);

  if (
    questionTerms.length < 2
  ) {
    return 0;
  }

  const contentText =
    String(content || '')
      .toLowerCase();

  let matched = 0;

  for (
    let index = 0;
    index < questionTerms.length - 1;
    index++
  ) {
    const first =
      questionTerms[index];

    const second =
      questionTerms[index + 1];

    const phrase =
      `${first} ${second}`;

    if (
      contentText.includes(phrase)
    ) {
      matched++;
    }
  }

  return (
    matched /
    Math.max(
      questionTerms.length - 1,
      1
    )
  );
}

function calculateDirectEvidenceScore(
  content
) {
  const text =
    String(content || '');

  if (!text.trim()) {
    return 0;
  }

  let matches = 0;

  for (
    const pattern of DIRECT_EVIDENCE_PATTERNS
  ) {
    if (pattern.test(text)) {
      matches++;
    }
  }

  return Math.min(
    matches / 4,
    1
  );
}

function calculateIndirectPenalty(
  content
) {
  const text =
    String(content || '');

  if (!text.trim()) {
    return 0;
  }

  let matches = 0;

  for (
    const pattern of INDIRECT_EVIDENCE_PATTERNS
  ) {
    if (pattern.test(text)) {
      matches++;
    }
  }

  return Math.min(
    matches / 3,
    1
  );
}

function calculateSectionEvidenceScore(
  content
) {
  const normalized =
    String(content || '')
      .toLowerCase();

  const sectionPatterns = [
    /\bmaterials?\s+and\s+methods?\b/i,
    /\bmethodology\b/i,
    /\bmethods?\b/i,
    /\bdata\s+loading\b/i,
    /\bdataset\b/i,
    /\bexperiments?\b/i,
    /\bresults?\b/i,
    /\bfindings?\b/i,
    /\bimplementation\b/i,
    /\bprocedure\b/i,
  ];

  let matches = 0;

  for (
    const pattern of sectionPatterns
  ) {
    if (
      pattern.test(normalized)
    ) {
      matches++;
    }
  }

  return Math.min(
    matches / 3,
    1
  );
}

// ======================================================
// Dataset Question Detection
// ======================================================

function isDatasetQuestion(question) {
  const text =
    normalizeRetrievalText(question);

  return (
    /\bdataset\b/.test(text) ||
    /\bdata\s*set\b/.test(text) ||
    /\bdata source\b/.test(text) ||
    /\btraining data\b/.test(text) ||
    /\btest data\b/.test(text) ||
    /\btesting data\b/.test(text) ||
    /\bimages? dataset\b/.test(text)
  );
}

// ======================================================
// Dataset Evidence
// IMPORTANT:
// This function intentionally uses RAW content for
// evidence detection so punctuation and section numbers
// remain available.
// ======================================================

function calculateDatasetEvidenceScore(question, content) {
  if (!isDatasetQuestion(question)) return 0;

  const rawText = String(content || '').trim();
  if (!rawText) return 0;

  const hasDatasetMention =
    /\bdataset\b|\bdata\s*set\b/i.test(rawText);

  // Explicit phrases that directly attribute the dataset to the
  // current study (this/our/the study/research/experiments USED it).
  const hasCurrentStudyUse =
    DATASET_CURRENT_STUDY_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );

  // Explicit study-verb form: "<this|our|the> study ... used/utilized/employed".
  const hasExplicitStudyUse =
    /\b(?:this|our|the)\s+(?:study|research|experiments?)\b/i.test(rawText) &&
    /\b(?:used|utilized|employed)\b/i.test(rawText);

  const hasAcquisition =
    DATASET_ACQUISITION_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );
  const hasExperimentRelationship =
    DATASET_EXPERIMENT_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );

  // Experiments/analysis performed/conducted on a dataset.
  const hasExperiments =
    /\b(?:experiments?|experimental\s+(?:analysis|evaluation|study|setup))\b[\s\S]{0,200}\b(?:conducted|performed|carried\s+out|run)\b[\s\S]{0,160}\b(?:on|using|with)\b[\s\S]{0,200}\b(?:dataset|data\s*set)\b/i.test(
      rawText
    );

  const hasDataLoading =
    /\bdata\s+loading\b|\b(?:load|loaded|loading)\b[\s\S]{0,140}\b(?:dataset|data\s*set|data|images?|samples?)\b/i.test(
      rawText
    );

  // Training / testing / validation relationship with a dataset.
  const hasTrainTestValidate =
    /\b(?:training|testing|test|validation|train|test|validat)\b[\s\S]{0,200}\b(?:dataset|data\s*set|images?|samples?)\b/i.test(
      rawText
    ) ||
    /\b(?:dataset|data\s*set)\b[\s\S]{0,200}\b(?:training|testing|test|validation|used\s+for\s+(?:training|testing|validation)|split)\b/i.test(
      rawText
    );

  const hasDatasetSection =
    /\b\d+(?:\.\d+)*\s+(?:dataset|data\s*set|data\s+loading)\b/i.test(rawText) ||
    /\b(?:dataset|data\s*set)\b[\s\S]{0,120}\b(?:materials?\s+and\s+methods?|methodology|methods?)\b/i.test(rawText) ||
    /\b(?:materials?\s+and\s+methods?|methodology|methods?)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i.test(rawText);
  const hasDescription =
    DATASET_DESCRIPTION_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );

  // Strong markers that the dataset belongs to another / previous study.
  const strongIndirectMatches =
    DATASET_STRONG_INDIRECT_PATTERNS.filter(
      (pattern) => pattern.test(rawText)
    ).length;
  const indirectMatches =
    DATASET_INDIRECT_PATTERNS.filter(
      (pattern) => pattern.test(rawText)
    ).length;

  const hasDirectStudyEvidence =
    hasCurrentStudyUse ||
    hasExplicitStudyUse ||
    hasAcquisition ||
    hasExperimentRelationship ||
    hasExperiments ||
    hasDataLoading ||
    hasTrainTestValidate;

  let score = hasDatasetMention ? 0.04 : 0;

  if (hasCurrentStudyUse) score += 0.50;
  if (hasExplicitStudyUse) score += 0.30;
  if (hasExperiments) score += 0.26;
  if (hasExperimentRelationship) score += 0.22;
  if (hasTrainTestValidate) score += 0.24;
  if (hasDataLoading) score += 0.20;
  if (hasAcquisition) score += 0.32;
  if (hasAcquisition && /\bkaggle\b/i.test(rawText)) {
    score += 0.18;
  }
  if (hasDatasetSection) score += 0.14;
  if (hasDescription) score += 0.10;

  if (strongIndirectMatches > 0) {
    // A dataset explicitly framed as related/previous/comparison work or
    // development/analysis must never outrank direct current-study evidence.
    score -= hasDirectStudyEvidence
      ? Math.min(strongIndirectMatches * 0.35, 0.75)
      : Math.min(strongIndirectMatches * 0.60, 0.98);
  } else if (hasDirectStudyEvidence) {
    score -= Math.min(indirectMatches * 0.06, 0.18);
  } else {
    score -= Math.min(indirectMatches * 0.22, 0.70);
  }

  if (/\b(?:obtained|downloaded|acquired|collected)\b[\s\S]{0,220}\bfrom\s+(?:the\s+)?kaggle\b/i.test(rawText)) {
    score += 0.12;
  }

  return Math.max(0, Math.min(score, 1));
}

// ======================================================
// Dataset Directness
// ======================================================

function calculateDatasetDirectness(
  question,
  content
) {
  if (!isDatasetQuestion(question)) {
    return 0;
  }

  const rawText = String(content || '').trim();
  if (!rawText) {
    return 0;
  }

  let score = 0;

  const hasCurrentStudyUse =
    DATASET_CURRENT_STUDY_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );

  // Strongest direct form: "<this|our|the> study used/utilized/employed <dataset>".
  const hasExplicitStudyUse =
    /\b(?:this|our|the)\s+(?:study|research|experiments?)\b/i.test(rawText) &&
    /\b(?:used|utilized|employed)\b/i.test(rawText);

  const hasAcquisition =
    DATASET_ACQUISITION_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );
  const hasExperimentRelationship =
    DATASET_EXPERIMENT_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );

  const hasExperiments =
    /\b(?:experiments?|experimental\s+(?:analysis|evaluation|study|setup))\b[\s\S]{0,200}\b(?:conducted|performed|carried\s+out|run)\b[\s\S]{0,160}\b(?:on|using|with)\b[\s\S]{0,200}\b(?:dataset|data\s*set)\b/i.test(
      rawText
    );

  const hasTrainTestValidate =
    /\b(?:training|testing|test|validation|train|test|validat)\b[\s\S]{0,200}\b(?:dataset|data\s*set|images?|samples?)\b/i.test(
      rawText
    ) ||
    /\b(?:dataset|data\s*set)\b[\s\S]{0,200}\b(?:training|testing|test|validation|used\s+for\s+(?:training|testing|validation)|split)\b/i.test(
      rawText
    );

  const hasDataLoading =
    /\bdata\s+loading\b|\b(?:load|loaded|loading)\b[\s\S]{0,140}\b(?:dataset|data\s*set|data|images?|samples?)\b/i.test(rawText);
  const hasDatasetSection =
    /\b(?:materials?\s+and\s+methods?|methodology|methods?)\b[\s\S]{0,180}\b(?:dataset|data\s*set)\b/i.test(rawText) ||
    /\b\d+(?:\.\d+)*\s+(?:dataset|data\s*set|data\s+loading)\b/i.test(rawText);
  const hasDescription =
    DATASET_DESCRIPTION_PATTERNS.some(
      (pattern) => pattern.test(rawText)
    );
  const hasKaggleAcquisition =
    /\b(?:obtained|downloaded|acquired|collected)\b[\s\S]{0,220}\bfrom\s+(?:the\s+)?kaggle\b/i.test(rawText) ||
    /\b(?:dataset|data\s*set)\b[\s\S]{0,180}\b(?:obtained|downloaded|acquired|collected)\b[\s\S]{0,180}\bfrom\s+(?:the\s+)?kaggle\b/i.test(rawText);

  const hasDirectEvidence =
    hasCurrentStudyUse ||
    hasExplicitStudyUse ||
    hasAcquisition ||
    hasExperimentRelationship ||
    hasExperiments ||
    hasDataLoading ||
    hasTrainTestValidate;

  if (hasExplicitStudyUse) score += 0.85;
  if (hasCurrentStudyUse && !hasExplicitStudyUse) score += 0.72;
  if (hasExperiments) score += 0.46;
  if (hasExperimentRelationship) score += 0.36;
  if (hasTrainTestValidate) score += 0.42;
  if (hasDataLoading) score += 0.38;
  if (hasAcquisition) score += 0.60;
  if (hasKaggleAcquisition) score += 0.16;
  if (hasDatasetSection) score += 0.14;
  if (hasDescription) score += 0.10;

  const strongIndirectMatches =
    DATASET_STRONG_INDIRECT_PATTERNS.filter(
      (pattern) => pattern.test(rawText)
    ).length;
  const indirectMatches =
    DATASET_INDIRECT_PATTERNS.filter(
      (pattern) => pattern.test(rawText)
    ).length;

  if (strongIndirectMatches > 0) {
    // A dataset framed as development/analysis or related/previous work
    // must not outrank direct current-study evidence.
    score -= hasDirectEvidence
      ? Math.min(strongIndirectMatches * 0.42, 0.85)
      : Math.min(strongIndirectMatches * 0.70, 0.98);
  } else if (indirectMatches > 0) {
    score -= hasDirectEvidence
      ? Math.min(indirectMatches * 0.08, 0.20)
      : Math.min(indirectMatches * 0.40, 0.90);
  }

  return Math.max(0, Math.min(score, 1));
}

// ======================================================
// Dataset Candidate Type
// Used to distinguish:
// 1. current-study dataset evidence
// 2. acquisition evidence
// 3. experiment/data-loading evidence
// 4. generic dataset mention
// ======================================================

function getDatasetEvidenceType(
  question,
  content
) {
  if (
    !isDatasetQuestion(question)
  ) {
    return 'none';
  }

  const rawText =
    String(content || '').trim();

  if (!rawText) {
    return 'none';
  }

  const hasCurrentStudy =
    DATASET_CURRENT_STUDY_PATTERNS.some(
      (pattern) =>
        pattern.test(rawText)
    );

  if (hasCurrentStudy) {
    return 'current-study-use';
  }

  const hasAcquisition =
    DATASET_ACQUISITION_PATTERNS.some(
      (pattern) =>
        pattern.test(rawText)
    );

  if (hasAcquisition) {
    return 'acquisition';
  }

  const hasExperiment =
    DATASET_EXPERIMENT_PATTERNS.some(
      (pattern) =>
        pattern.test(rawText)
    );

  if (hasExperiment) {
    return 'experiment-data';
  }

  const hasDescription =
    DATASET_DESCRIPTION_PATTERNS.some(
      (pattern) =>
        pattern.test(rawText)
    );

  if (hasDescription) {
    return 'dataset-description';
  }

  if (
    /\bdataset\b|\bdata\s*set\b/i.test(
      rawText
    )
  ) {
    return 'generic-dataset-mention';
  }

  return 'none';
}

// ======================================================
// Document-Aware Retrieval
// ======================================================

function extractQuestionDocumentHints(
  question
) {
  const text =
    normalizeRetrievalText(question);

  const hints = new Set();

  const pdfMatches =
    text.match(
      /\b([a-z0-9][a-z0-9 _-]{1,80})\s+pdf\b/g
    );

  if (pdfMatches) {
    for (
      const match of pdfMatches
    ) {
      const cleaned =
        match
          .replace(/\bpdf\b/g, '')
          .trim();

      if (cleaned) {
        hints.add(cleaned);
      }
    }
  }

  const identityMatches = [
    ...text.matchAll(
      /\b(?:in|from|according to|based on|for)\s+([a-z0-9][a-z0-9_-]{1,60})\b/g
    ),
  ];

  for (
    const match of identityMatches
  ) {
    const candidate =
      String(match[1] || '')
        .trim();

    if (
      candidate &&
      !STOP_WORDS.has(candidate) &&
      candidate !== 'the' &&
      candidate !== 'study' &&
      candidate !== 'paper'
    ) {
      hints.add(candidate);
    }
  }

  return [
    ...hints,
  ];
}

function calculateDocumentIdentityMatch(
  question,
  documentName
) {
  const questionText =
    normalizeRetrievalText(question);

  const documentText =
    normalizeRetrievalText(documentName);

  if (
    !questionText ||
    !documentText
  ) {
    return 0;
  }

  const documentBase =
    documentText
      .replace(/\bpdf\b/g, '')
      .trim();

  if (!documentBase) {
    return 0;
  }

  // Strongest possible match:
  // entire document name appears in question.
  if (
    questionText.includes(
      documentBase
    )
  ) {
    return 1;
  }

  const hints =
    extractQuestionDocumentHints(
      question
    );

  for (
    const hint of hints
  ) {
    const normalizedHint =
      normalizeRetrievalText(
        hint
      );

    if (
      normalizedHint &&
      (
        documentBase.includes(
          normalizedHint
        ) ||
        normalizedHint.includes(
          documentBase
        )
      )
    ) {
      return 1;
    }
  }

  const questionTokens =
    new Set(
      questionText
        .split(/\s+/)
        .filter(
          (token) =>
            token.length >= 4 &&
            !STOP_WORDS.has(token)
        )
    );

  const documentTokens =
    documentBase
      .split(/\s+/)
      .filter(
        (token) =>
          token.length >= 4
      );

  if (
    documentTokens.length === 0
  ) {
    return 0;
  }

  const matched =
    documentTokens.filter(
      (token) =>
        questionTokens.has(token)
    ).length;

  return Math.min(
    1,
    matched /
      documentTokens.length
  );
}

// ======================================================
// Multi-study Question
// ======================================================

function isMultiStudyQuestion(
  question
) {
  const text =
    normalizeRetrievalText(question);

  return (
    /\bstudies\b/.test(text) ||
    /\bpapers\b/.test(text) ||
    /\bresearches\b/.test(text) ||
    /\bmultiple studies\b/.test(text) ||
    /\bdifferent studies\b/.test(text) ||
    /\bthese studies\b/.test(text)
  );
}

// ======================================================
// Study / Topic Relevance
// ======================================================

function calculateStudyTopicRelevance(
  question,
  row
) {
  const content =
    String(row?.content || '');

  const documentName =
    String(
      row?.document_name || ''
    );

  const lexical =
    calculateLexicalOverlap(
      question,
      content
    );

  const phrase =
    calculatePhraseOverlap(
      question,
      content
    );

  const documentIdentity =
    calculateDocumentIdentityMatch(
      question,
      documentName
    );

  const score =
    lexical * 0.55 +
    phrase * 0.20 +
    documentIdentity * 0.25;

  return Math.max(
    0,
    Math.min(
      1,
      score
    )
  );
}

// ======================================================
// Generic Evidence Score
// ======================================================

function scoreEvidenceRelevance(
  question,
  row
) {
  const similarity =
    Number(row.similarity) || 0;

  const content =
    String(row.content || '');

  const lexicalOverlap =
    calculateLexicalOverlap(
      question,
      content
    );

  const phraseOverlap =
    calculatePhraseOverlap(
      question,
      content
    );

  const directEvidence =
    calculateDirectEvidenceScore(
      content
    );

  const indirectPenalty =
    calculateIndirectPenalty(
      content
    );

  const sectionEvidence =
    calculateSectionEvidenceScore(
      content
    );

  let evidenceScore =
    similarity * 0.55 +
    lexicalOverlap * 0.15 +
    phraseOverlap * 0.10 +
    directEvidence * 0.15 +
    sectionEvidence * 0.05 -
    indirectPenalty * 0.15;

  evidenceScore =
    Math.max(
      0,
      Math.min(
        1,
        evidenceScore
      )
    );

  return {
    similarity,
    lexicalOverlap,
    phraseOverlap,
    directEvidence,
    indirectPenalty,
    sectionEvidence,
    evidenceScore,
  };
}

// ======================================================
// Final Retrieval Score
// ======================================================

function calculateFinalRetrievalScore(
  evidence,
  documentIdentity,
  datasetEvidence,
  studyTopicRelevance,
  datasetDirectness
) {
  const baseScore =
    Number(
      evidence.evidenceScore || 0
    );

  const documentBoost =
    Number(
      documentIdentity || 0
    ) *
    DOCUMENT_IDENTITY_WEIGHT;

  const datasetBoost =
    Number(
      datasetEvidence || 0
    ) *
    DATASET_EVIDENCE_WEIGHT;

  const datasetDirectnessBoost =
    Number(
      datasetDirectness || 0
    ) *
    DATASET_DIRECTNESS_WEIGHT;

  const topicBoost =
    Number(
      studyTopicRelevance || 0
    ) *
    0.10;

  return Math.max(
    0,
    Math.min(
      1,
      baseScore +
        documentBoost +
        datasetBoost +
        datasetDirectnessBoost +
        topicBoost
    )
  );
}

// ======================================================
// Merge Search Rows
// ======================================================

function mergeSearchRows(
  ...rowGroups
) {
  const map =
    new Map();

  for (
    const group of rowGroups
  ) {
    for (
      const row of group || []
    ) {
      const key =
        String(row.id);

      const existing =
        map.get(key);

      if (
        !existing ||
        Number(row.similarity) >
          Number(existing.similarity)
      ) {
        map.set(
          key,
          row
        );
      }
    }
  }

  return [
    ...map.values(),
  ];
}

// ======================================================
// RAG Retrieval Filter + Evidence Reranking
// ======================================================

function filterRelevantDocuments(
  rows,
  requestedTopK,
  question
) {
  if (
    !rows ||
    rows.length === 0
  ) {
    return [];
  }

  console.log(
    `\n[RAG] Filtering ${rows.length} candidate chunks...`
  );

  const datasetQuestion =
    isDatasetQuestion(question);

  const multiStudy =
    isMultiStudyQuestion(question);

  console.log(
    `[RAG] Dataset question: ${datasetQuestion}`
  );

  console.log(
    `[RAG] Multi-study question: ${multiStudy}`
  );

  const filtered = [];

  for (
    const row of rows
  ) {
    const similarity =
      Number(row.similarity);

    const documentName =
      row.document_name ||
      'Unknown document';

    const chunkIndex =
      row.chunk_index ??
      'unknown';

    const content =
      String(row.content || '')
        .trim();

    // --------------------------------------------------
    // Reference filtering
    // --------------------------------------------------

    if (
      isReferenceChunk(content)
    ) {
      console.log(
        `[RAG] ${documentName} | ` +
        `Chunk ${chunkIndex} | ` +
        `Similarity ${similarity.toFixed(4)} | ` +
        `Keep: false | ` +
        `Reason: reference/bibliography`
      );

      continue;
    }

    // --------------------------------------------------
    // Document identity
    // --------------------------------------------------

    const documentIdentity =
      calculateDocumentIdentityMatch(
        question,
        documentName
      );

    const explicitDocument =
      documentIdentity >= 0.90;

    const datasetEvidence =
      calculateDatasetEvidenceScore(
        question,
        content
      );

    const datasetDirectness =
      calculateDatasetDirectness(
        question,
        content
      );

    const allowedSimilarity =
      explicitDocument
        ? 0.40
        : datasetQuestion &&
            (
              datasetDirectness >= 0.35 ||
              datasetEvidence >= 0.40
            )
          ? 0.30
          : MIN_SIMILARITY;

    if (
      similarity < allowedSimilarity
    ) {
      console.log(
        `[RAG] ${documentName} | ` +
        `Chunk ${chunkIndex} | ` +
        `Similarity ${similarity.toFixed(4)} | ` +
        `Keep: false | ` +
        `Reason: below similarity threshold`
      );

      continue;
    }

    const evidence =
      scoreEvidenceRelevance(
        question,
        row
      );

    const datasetEvidenceType =
      getDatasetEvidenceType(
        question,
        content
      );

    const studyTopicRelevance =
      calculateStudyTopicRelevance(
        question,
        row
      );

    const finalEvidenceScore =
      calculateFinalRetrievalScore(
        evidence,
        documentIdentity,
        datasetEvidence,
        studyTopicRelevance,
        datasetDirectness
      );

    const enrichedRow = {
      ...row,

      evidenceScore:
        evidence.evidenceScore,

      lexicalOverlap:
        evidence.lexicalOverlap,

      phraseOverlap:
        evidence.phraseOverlap,

      directEvidence:
        evidence.directEvidence,

      indirectPenalty:
        evidence.indirectPenalty,

      sectionEvidence:
        evidence.sectionEvidence,

      documentIdentity,

      datasetEvidence,

      datasetDirectness,

      datasetEvidenceType,

      studyTopicRelevance,

      finalEvidenceScore,
    };

    console.log(
      `[RAG] ${documentName} | ` +
      `Chunk ${chunkIndex} | ` +
      `Similarity ${similarity.toFixed(4)} | ` +
      `Evidence ${evidence.evidenceScore.toFixed(4)} | ` +
      `DocumentMatch ${documentIdentity.toFixed(4)} | ` +
      `DatasetEvidence ${datasetEvidence.toFixed(4)} | ` +
      `DatasetDirectness ${datasetDirectness.toFixed(4)} | ` +
      `DatasetType ${datasetEvidenceType} | ` +
      `Topic ${studyTopicRelevance.toFixed(4)} | ` +
      `Final ${finalEvidenceScore.toFixed(4)} | ` +
      `Keep: true`
    );

    // ====================================================
    // DATASET DEBUG: Detailed logging for dataset questions
    // ====================================================
    if (datasetQuestion && (datasetEvidence > 0 || datasetDirectness > 0)) {
      console.log(`\n[DATASET DEBUG] ==========================================`);
      console.log(`[DATASET DEBUG] Document: ${documentName}`);
      console.log(`[DATASET DEBUG] Chunk: ${chunkIndex}`);
      console.log(`[DATASET DEBUG] Similarity: ${similarity.toFixed(4)}`);
      console.log(`[DATASET DEBUG] DocumentIdentity: ${documentIdentity.toFixed(4)}`);
      console.log(`[DATASET DEBUG] DatasetEvidence: ${datasetEvidence.toFixed(4)}`);
      console.log(`[DATASET DEBUG] DatasetDirectness: ${datasetDirectness.toFixed(4)}`);
      console.log(`[DATASET DEBUG] FinalEvidenceScore: ${finalEvidenceScore.toFixed(4)}`);
      console.log(`[DATASET DEBUG] EvidenceType: ${datasetEvidenceType}`);
      
      // Show first 500 chars of chunk
      const preview = content.substring(0, 500).replace(/\s+/g, ' ');
      console.log(`[DATASET DEBUG] Text preview: ${preview}...`);
      
      // Check for indirect patterns
      const strongIndirectCount = DATASET_STRONG_INDIRECT_PATTERNS.filter(
        p => p.test(content)
      ).length;
      const indirectCount = DATASET_INDIRECT_PATTERNS.filter(
        p => p.test(content)
      ).length;
      
      console.log(`[DATASET DEBUG] Strong indirect markers: ${strongIndirectCount}`);
      console.log(`[DATASET DEBUG] Indirect markers: ${indirectCount}`);
      
      // Check for direct patterns
      const hasCurrentStudy = DATASET_CURRENT_STUDY_PATTERNS.some(p => p.test(content));
      const hasAcquisition = DATASET_ACQUISITION_PATTERNS.some(p => p.test(content));
      const hasExperiment = DATASET_EXPERIMENT_PATTERNS.some(p => p.test(content));
      
      console.log(`[DATASET DEBUG] Has current-study pattern: ${hasCurrentStudy}`);
      console.log(`[DATASET DEBUG] Has acquisition pattern: ${hasAcquisition}`);
      console.log(`[DATASET DEBUG] Has experiment pattern: ${hasExperiment}`);
      console.log(`[DATASET DEBUG] ==========================================\n`);
    }

    filtered.push(
      enrichedRow
    );
  }

  // ----------------------------------------------------
  // Generic sort
  // ----------------------------------------------------

  filtered.sort(
    (a, b) => {
      const scoreDifference =
        Number(
          b.finalEvidenceScore
        ) -
        Number(
          a.finalEvidenceScore
        );

      if (
        Math.abs(scoreDifference) >
        0.0001
      ) {
        return scoreDifference;
      }

      return (
        Number(b.similarity) -
        Number(a.similarity)
      );
    }
  );

  console.log(
    `[RAG] ${filtered.length} chunks passed initial filters`
  );

  // ----------------------------------------------------
  // Evidence threshold
  // ----------------------------------------------------

  let evidenceFiltered =
    filtered.filter(
      (row) =>
        Number(
          row.finalEvidenceScore
        ) >=
        MIN_EVIDENCE_SCORE
    );

  if (
    evidenceFiltered.length === 0 &&
    filtered.length > 0
  ) {
    console.warn(
      '[RAG] Evidence threshold removed all candidates.'
    );

    evidenceFiltered =
      filtered.slice(0, 1);
  }

  // ====================================================
  // DATASET-SPECIFIC SORTING
  //
  // Priority:
  //
  // 1. Explicit document identity
  // 2. Dataset directness
  // 3. Dataset evidence
  // 4. Overall evidence score
  // 5. Similarity as a tie breaker
  //
  // This prevents a high-similarity related dataset
  // mention from beating direct current-study evidence.
  // ====================================================

  if (datasetQuestion) {
    evidenceFiltered.sort(
      compareDatasetEvidenceRows
    );
  }

  // ====================================================
  // Final selection
  // ====================================================

  let selected = [];

  // ----------------------------------------------------
  // Multi-study dataset question
  //
  // Pick strongest evidence from each document first.
  // ----------------------------------------------------

  if (
    multiStudy &&
    requestedTopK > 1
  ) {
    const selectedDocuments =
      new Set();

    const documentCandidates =
      new Map();

    for (
      const row of evidenceFiltered
    ) {
      const documentKey =
        String(
          row.document_id ??
          row.document_name ??
          'unknown'
        );

      const existing =
        documentCandidates.get(
          documentKey
        );

      if (!existing) {
        documentCandidates.set(
          documentKey,
          row
        );
        continue;
      }

      if (
        compareDatasetEvidenceRows(
          row,
          existing
        ) < 0
      ) {
        documentCandidates.set(
          documentKey,
          row
        );
      }
    }

    const strongestPerDocument =
      [
        ...documentCandidates.values(),
      ].sort(
        compareDatasetEvidenceRows
      );

    for (
      const row of strongestPerDocument
    ) {
      const documentKey =
        String(
          row.document_id ??
          row.document_name ??
          'unknown'
        );

      if (
        selectedDocuments.has(
          documentKey
        )
      ) {
        continue;
      }

      selected.push(row);

      selectedDocuments.add(
        documentKey
      );

      if (
        selected.length >=
        requestedTopK
      ) {
        break;
      }
    }

    // Fill remaining slots if necessary.
    if (
      selected.length <
      requestedTopK
    ) {
      for (
        const row of evidenceFiltered
      ) {
        if (
          selected.includes(row)
        ) {
          continue;
        }

        selected.push(row);

        if (
          selected.length >=
          requestedTopK
        ) {
          break;
        }
      }
    }
  } else {
    // --------------------------------------------------
    // Single-study question
    //
    // Dataset questions use the evidence ranking above.
    // --------------------------------------------------

    selected =
      evidenceFiltered.slice(
        0,
        requestedTopK
      );
  }

  console.log(
    `[RAG] Selected ${selected.length} final evidence chunks`
  );

  selected.forEach(
    (row, index) => {
      console.log(
        `[RAG] Final rank ${index + 1}: ` +
        `${row.document_name} | ` +
        `Chunk ${row.chunk_index} | ` +
        `Similarity ${Number(
          row.similarity
        ).toFixed(4)} | ` +
        `Evidence ${Number(
          row.evidenceScore
        ).toFixed(4)} | ` +
        `DocumentMatch ${Number(
          row.documentIdentity || 0
        ).toFixed(4)} | ` +
        `DatasetEvidence ${Number(
          row.datasetEvidence || 0
        ).toFixed(4)} | ` +
        `DatasetDirectness ${Number(
          row.datasetDirectness || 0
        ).toFixed(4)} | ` +
        `DatasetType ${row.datasetEvidenceType || 'none'} | ` +
        `Topic ${Number(
          row.studyTopicRelevance || 0
        ).toFixed(4)} | ` +
        `Final ${Number(
          row.finalEvidenceScore || 0
        ).toFixed(4)}`
      );
    }
  );

  return selected;
}

// ======================================================
// Dataset Evidence Ordering
// ======================================================

function compareDatasetEvidenceRows(a, b) {
  const priorityFields = [
    'documentIdentity',
    'datasetDirectness',
    'datasetEvidence',
    'finalEvidenceScore',
    'similarity',
  ];

  for (const field of priorityFields) {
    const difference =
      Number(b?.[field] || 0) -
      Number(a?.[field] || 0);

    if (Math.abs(difference) > 0.0001) {
      return difference;
    }
  }

  return 0;
}

// ======================================================
// Citation Helpers
// ======================================================

function getUsedCitationIds(answer) {
  const text =
    String(answer || '');

  const citationIds =
    new Set();

  const standardMatches = [
    ...text.matchAll(
      /\[Source\s+(\d+)\]/gi
    ),
  ];

  for (
    const match of standardMatches
  ) {
    const id =
      Number(match[1]);

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      citationIds.add(id);
    }
  }

  const unicodeMatches = [
    ...text.matchAll(
      /【Source\s+(\d+)】/gi
    ),
  ];

  for (
    const match of unicodeMatches
  ) {
    const id =
      Number(match[1]);

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      citationIds.add(id);
    }
  }

  return [
    ...citationIds,
  ];
}

function filterUsedCitations(
  citations,
  answer
) {
  if (
    !Array.isArray(citations)
  ) {
    return [];
  }

  const usedCitationIds =
    getUsedCitationIds(
      answer
    );

  console.log(
    `[RAG] Citation IDs detected in answer:`,
    usedCitationIds
  );

  if (
    usedCitationIds.length === 0
  ) {
    return [];
  }

  const finalCitations =
    citations.filter(
      (citation) =>
        usedCitationIds.includes(
          citation.citationId
        )
    );

  console.log(
    `[RAG] ${finalCitations.length}/${citations.length} citation(s) used by final answer`
  );

  return finalCitations;
}

function normalizeAnswer(answer) {
  return String(answer || '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ======================================================
// Upload Endpoint
// ======================================================

app.post(
  '/api/upload',
  upload.single('file'),
  async (req, res) => {
    let documentId = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          error:
            'No file uploaded.',
        });
      }

      console.log(
        `\n[Upload] Processing: ${req.file.originalname}`
      );

      const text =
        await extractText(
          req.file
        );

      if (
        !text ||
        !text.trim()
      ) {
        return res.status(400).json({
          error:
            'Could not extract readable text from this document.',
        });
      }

      console.log(
        `[Upload] Extracted ${text.length} characters`
      );

      const textSplitter =
        new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

      const docs =
        await textSplitter.createDocuments([
          text,
        ]);

      console.log(
        `[Upload] Created ${docs.length} chunks`
      );

      const documentResult =
        await pool.query(
          `
          INSERT INTO documents (
            name,
            file_type,
            file_size,
            chunks_count,
            status
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, uploaded_at;
          `,
          [
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            docs.length,
            'processing',
          ]
        );

      documentId =
        documentResult.rows[0].id;

      console.log(
        `[DB] Document created: ${documentId}`
      );

      for (
        let index = 0;
        index < docs.length;
        index++
      ) {
        const doc =
          docs[index];

        console.log(
          `[Embedding] ${index + 1}/${docs.length}`
        );

        const embedding =
          await createEmbedding(
            doc.pageContent
          );

        const vector =
          embeddingToVector(
            embedding
          );

        await pool.query(
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
          );
          `,
          [
            documentId,
            doc.pageContent,
            index,
            vector,
            JSON.stringify({
              source:
                req.file.originalname,
              fileType:
                req.file.mimetype,
              chunkIndex:
                index,
            }),
          ]
        );
      }

      await pool.query(
        `
        UPDATE documents
        SET status = 'ready'
        WHERE id = $1;
        `,
        [documentId]
      );

      console.log(
        `[Indexed] ${req.file.originalname} successfully`
      );

      const documentsResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            file_type AS "fileType",
            file_size AS "fileSize",
            chunks_count AS "chunksCount",
            status,
            uploaded_at AS "uploadedAt"
          FROM documents
          ORDER BY uploaded_at DESC;
          `
        );

      return res.json({
        message:
          'Document successfully indexed into persistent RAG storage.',

        file:
          req.file.originalname,

        totalChunks:
          docs.length,

        documentId,

        documents:
          documentsResult.rows,
      });
    } catch (error) {
      console.error(
        '[Upload Error]',
        error
      );

      if (documentId) {
        try {
          await pool.query(
            `
            UPDATE documents
            SET status = 'failed'
            WHERE id = $1;
            `,
            [documentId]
          );
        } catch (dbError) {
          console.error(
            '[DB] Failed to update document status:',
            dbError
          );
        }
      }

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process document.',
      });
    }
  }
);

// ======================================================
// Chat Endpoint
// ======================================================

app.post(
  '/api/chat',
  async (req, res) => {
    const {
      question,

      selectedModel = 'main',

      systemPrompt =
        'You are a professional AI Assistant. Answer strictly based on retrieved document knowledge.',

      topK = 3,
    } = req.body;

    try {
      if (
        typeof question !== 'string' ||
        !question.trim()
      ) {
        return res.status(400).json({
          error:
            'Question is required.',
        });
      }

      const cleanQuestion =
        question.trim();

      const documentCountResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS count
          FROM documents
          WHERE status = 'ready';
          `
        );

      if (
        documentCountResult.rows[0].count === 0
      ) {
        return res.status(400).json({
          answer:
            'ကျေးဇူးပြု၍ မေးခွန်းမမေးမီ Document တစ်ခုခု upload တင်ပေးပါရှင်။',

          citations: [],

          usage: null,
        });
      }

      const safeTopK =
        Math.min(
          Math.max(
            Number(topK) || 3,
            1
          ),
          10
        );

      const datasetQuestion =
        isDatasetQuestion(
          cleanQuestion
        );

      const multiStudy =
        isMultiStudyQuestion(
          cleanQuestion
        );

      console.log(
        `\n================================================`
      );

      console.log(
        `[Chat] Question: ${cleanQuestion}`
      );

      console.log(
        `[Chat] Requested topK: ${safeTopK}`
      );

      console.log(
        `[Chat] Dataset question: ${datasetQuestion}`
      );

      console.log(
        `[Chat] Multi-study question: ${multiStudy}`
      );

      // ------------------------------------------------
      // Query embedding
      // ------------------------------------------------

      console.log(
        '[Chat] Creating query embedding...'
      );

      const queryEmbedding =
        await createEmbedding(
          cleanQuestion
        );

      const queryVector =
        embeddingToVector(
          queryEmbedding
        );

      // ------------------------------------------------
      // Normal vector search
      // ------------------------------------------------

      console.log(
        `[Chat] Searching top ${RAG_SEARCH_LIMIT} candidates...`
      );

      const searchResult =
        await pool.query(
          `
          SELECT
            dc.id,
            dc.content,
            dc.chunk_index,
            dc.metadata,
            d.id AS document_id,
            d.name AS document_name,
            1 - (
              dc.embedding <=> $1::vector
            ) AS similarity
          FROM document_chunks dc
          INNER JOIN documents d
            ON d.id = dc.document_id
          WHERE d.status = 'ready'
          ORDER BY dc.embedding <=> $1::vector
          LIMIT $2;
          `,
          [
            queryVector,
            RAG_SEARCH_LIMIT,
          ]
        );

      const semanticRows =
        searchResult.rows;

      console.log(
        `[RAG] Retrieved ${semanticRows.length} semantic candidate chunks`
      );

      // ------------------------------------------------
      // Dataset-focused retrieval
      // ------------------------------------------------

      let datasetRows = [];

      if (datasetQuestion) {
        console.log(
          `[RAG] Running dataset-focused retrieval for up to ${DATASET_SEARCH_LIMIT} candidates...`
        );

        const datasetResult =
          await pool.query(
            `
            SELECT
              dc.id,
              dc.content,
              dc.chunk_index,
              dc.metadata,
              d.id AS document_id,
              d.name AS document_name,
              1 - (
                dc.embedding <=> $1::vector
              ) AS similarity
            FROM document_chunks dc
            INNER JOIN documents d
              ON d.id = dc.document_id
            WHERE
              d.status = 'ready'
              AND (
                LOWER(dc.content) LIKE '%dataset%'
                OR LOWER(dc.content) LIKE '%data set%'
                OR LOWER(dc.content) LIKE '%data loading%'
                OR LOWER(dc.content) LIKE '%kaggle%'
                OR LOWER(dc.content) LIKE '%from kaggle%'
                OR LOWER(dc.content) LIKE '%obtained from kaggle%'
                OR LOWER(dc.content) LIKE '%downloaded from kaggle%'
                OR LOWER(dc.content) LIKE '%acquired from kaggle%'
                OR LOWER(dc.content) LIKE '%collected from kaggle%'
                OR LOWER(dc.content) LIKE '%obtained%'
                OR LOWER(dc.content) LIKE '%downloaded%'
                OR LOWER(dc.content) LIKE '%acquired%'
                OR LOWER(dc.content) LIKE '%collected%'
                OR LOWER(dc.content) LIKE '%training%'
                OR LOWER(dc.content) LIKE '%testing%'
                OR LOWER(dc.content) LIKE '%validation%'
                OR LOWER(dc.content) LIKE '%data loading%'
                OR LOWER(dc.content) LIKE '%dataset obtained%'
                OR LOWER(dc.content) LIKE '%dataset downloaded%'
                OR LOWER(dc.content) LIKE '%dataset acquired%'
                OR LOWER(dc.content) LIKE '%dataset collected%'
                OR LOWER(dc.content) LIKE '%obtained from%'
                OR LOWER(dc.content) LIKE '%downloaded from%'
                OR LOWER(dc.content) LIKE '%acquired from%'
                OR LOWER(dc.content) LIKE '%collected from%'
              )
            ORDER BY dc.embedding <=> $1::vector
            LIMIT $2;
            `,
            [
              queryVector,
              DATASET_SEARCH_LIMIT,
            ]
          );

        datasetRows =
          datasetResult.rows;

        console.log(
          `[RAG] Retrieved ${datasetRows.length} dataset-focused candidates`
        );
      }

      // ------------------------------------------------
      // Explicit document retrieval
      // ------------------------------------------------

      let explicitDocumentRows = [];

      const readyDocumentsResult =
        await pool.query(
          `
          SELECT
            id,
            name
          FROM documents
          WHERE status = 'ready';
          `
        );

      const matchingDocuments =
        readyDocumentsResult.rows.filter(
          (document) =>
            calculateDocumentIdentityMatch(
              cleanQuestion,
              document.name
            ) >= 0.90
        );

      if (
        matchingDocuments.length > 0
      ) {
        console.log(
          `[RAG] Explicit document matches: ${matchingDocuments
            .map((document) => document.name)
            .join(', ')}`
        );

        for (
          const document of matchingDocuments
        ) {
          const documentResult =
            await pool.query(
              `
              SELECT
                dc.id,
                dc.content,
                dc.chunk_index,
                dc.metadata,
                d.id AS document_id,
                d.name AS document_name,
                1 - (
                  dc.embedding <=> $1::vector
                ) AS similarity
              FROM document_chunks dc
              INNER JOIN documents d
                ON d.id = dc.document_id
              WHERE
                d.status = 'ready'
                AND d.id = $2
              ORDER BY dc.embedding <=> $1::vector
              LIMIT $3;
              `,
              [
                queryVector,
                document.id,
                EXPLICIT_DOCUMENT_SEARCH_LIMIT,
              ]
            );

          explicitDocumentRows =
            explicitDocumentRows.concat(
              documentResult.rows
            );
        }

        console.log(
          `[RAG] Retrieved ${explicitDocumentRows.length} explicit-document candidates`
        );
      }

      // ------------------------------------------------
      // Merge all retrieval strategies
      // ------------------------------------------------

      const searchRows =
        mergeSearchRows(
          semanticRows,
          datasetRows,
          explicitDocumentRows
        );

      console.log(
        `[RAG] Combined unique candidates: ${searchRows.length}`
      );

      // ------------------------------------------------
      // Evidence reranking
      // ------------------------------------------------

      const relevantDocs =
        filterRelevantDocuments(
          searchRows,
          safeTopK,
          cleanQuestion
        );

      console.log(
        `[RAG] Final relevant chunks: ${relevantDocs.length}`
      );

      // ------------------------------------------------
      // Debug selected chunks
      // ------------------------------------------------

      relevantDocs.forEach(
        (doc, index) => {
          console.log(
            `\n[RAG] ===== Selected Source ${
              index + 1
            } =====`
          );

          console.log(
            `[RAG] Document: ${doc.document_name}`
          );

          console.log(
            `[RAG] Chunk: ${doc.chunk_index}`
          );

          console.log(
            `[RAG] Similarity: ${Number(
              doc.similarity
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Evidence Score: ${Number(
              doc.evidenceScore
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Document Match: ${Number(
              doc.documentIdentity || 0
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Dataset Evidence: ${Number(
              doc.datasetEvidence || 0
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Dataset Directness: ${Number(
              doc.datasetDirectness || 0
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Dataset Type: ${
              doc.datasetEvidenceType ||
              'none'
            }`
          );

          console.log(
            `[RAG] Study Topic Relevance: ${Number(
              doc.studyTopicRelevance
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Final Retrieval Score: ${Number(
              doc.finalEvidenceScore || 0
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Lexical Overlap: ${Number(
              doc.lexicalOverlap
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Direct Evidence: ${Number(
              doc.directEvidence
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Indirect Penalty: ${Number(
              doc.indirectPenalty
            ).toFixed(4)}`
          );

          console.log(
            `[RAG] Content:\n${doc.content.slice(
              0,
              1500
            )}`
          );

          console.log(
            '[RAG] =================================\n'
          );
        }
      );

      // ------------------------------------------------
      // No context
      // ------------------------------------------------

      if (
        relevantDocs.length === 0
      ) {
        console.log(
          '[RAG] No sufficiently relevant context found.'
        );

        return res.json({
          answer:
            FALLBACK_ANSWER,

          citations: [],

          usage: null,
        });
      }

      // ------------------------------------------------
      // Build context
      // ------------------------------------------------

      // MULTI-STUDY DEBUG
      if (multiStudy) {
        console.log('\n[MULTI-STUDY DEBUG] ==========================================');
        console.log(`[MULTI-STUDY DEBUG] Question: ${cleanQuestion}`);
        console.log(`[MULTI-STUDY DEBUG] Detected as multi-study: ${multiStudy}`);
        console.log(`[MULTI-STUDY DEBUG] Selected documents count: ${relevantDocs.length}`);
        
        const uniqueDocs = new Set(relevantDocs.map(d => d.document_name));
        console.log(`[MULTI-STUDY DEBUG] Unique documents: ${[...uniqueDocs].join(', ')}`);
        
        relevantDocs.forEach((doc, idx) => {
          console.log(`[MULTI-STUDY DEBUG] Source ${idx + 1}: ${doc.document_name}`);
          console.log(`[MULTI-STUDY DEBUG]   - Chunk: ${doc.chunk_index}`);
          console.log(`[MULTI-STUDY DEBUG]   - DatasetEvidence: ${(doc.datasetEvidence || 0).toFixed(4)}`);
          console.log(`[MULTI-STUDY DEBUG]   - DatasetType: ${doc.datasetEvidenceType || 'none'}`);
        });
        console.log('[MULTI-STUDY DEBUG] ==========================================\n');
      }

      const contextText =
        relevantDocs
          .map(
            (doc, index) =>
              `[Source ${
                index + 1
              }: ${doc.document_name} | Chunk ${doc.chunk_index} | DatasetEvidence ${Number(
                doc.datasetEvidence || 0
              ).toFixed(2)} | DatasetType ${
                doc.datasetEvidenceType ||
                'none'
              }]\n${doc.content}`
          )
          .join(
            '\n\n---\n\n'
          );

      // ------------------------------------------------
      // Citations
      // ------------------------------------------------

      const citations =
        relevantDocs.map(
          (doc, index) => ({
            citationId:
              index + 1,

            source:
              doc.document_name,

            chunkIndex:
              doc.chunk_index,

            similarity:
              Number(
                doc.similarity
              ),

            contentSnippet:
              doc.content.length > 200
                ? doc.content.slice(
                    0,
                    200
                  ) + '...'
                : doc.content,
          })
        );

      // ------------------------------------------------
      // Select model
      // ------------------------------------------------

      const model =
        selectedModel === 'fast'
          ? FAST_MODEL
          : MAIN_MODEL;

      console.log(
        `[Chat] Model: ${model}`
      );

      const llm =
        new ChatGroq({
          apiKey:
            process.env.GROQ_API_KEY,

          model,

          temperature: 0.1,
        });

      // ==================================================
      // Strict RAG Prompt
      // ==================================================

      const fullPrompt = `
${systemPrompt}

You are answering a question using a retrieved knowledge base.

IMPORTANT:

The Retrieved Context below is the ONLY source of knowledge you are allowed to use.

STRICT RAG RULES:

1. Answer ONLY using information explicitly stated in the Retrieved Context.

2. Do NOT use outside knowledge.

3. Do NOT use pretrained knowledge that is not present in the Retrieved Context.

4. Do NOT use assumptions or general world knowledge.

5. Do NOT invent facts, numbers, conclusions, causes, outcomes, recommendations, or explanations.

6. Do NOT infer a conclusion unless the Retrieved Context explicitly supports that conclusion.

7. Every factual claim in your answer MUST be supported by one or more retrieved sources.

8. If a claim cannot be directly supported by the Retrieved Context, DO NOT include that claim.

9. If the Retrieved Context does not contain enough evidence to answer the question, return EXACTLY:

${FALLBACK_ANSWER}

10. When making a factual claim, include the relevant citation such as [Source 1].

11. Only cite a source when its retrieved content actually supports the claim.

12. Do not cite a source merely because it is related to the topic.

13. If multiple sources support different parts of an answer, cite each claim with the appropriate source.

14. Do not combine unrelated information from different sources into a new unsupported conclusion.

15. Prefer direct statements from the Retrieved Context over interpretation.

16. Keep the answer concise and evidence-based.

17. Never mention information that is not supported by the Retrieved Context.

18. Do not use information merely because it is topically related to the question.

19. A retrieved source must contain direct evidence for the claim you make.

20. If only one retrieved source directly answers the question, use that source rather than forcing information from other sources.

21. Do not treat reference lists, bibliographies, citation metadata, author lists, DOI information, or publication details as substantive evidence unless the question specifically asks about those details.

22. If the Retrieved Context contains related information but does not directly answer the question, return EXACTLY:

${FALLBACK_ANSWER}

23. Prefer the most directly relevant passage over passages that are only semantically similar.

24. If the question asks about something that is NOT directly supported by the Retrieved Context, use the exact fallback sentence instead of trying to answer from your own knowledge.

25. Do not guess what the authors may have intended.

26. Do not use your knowledge of medicine, science, technology, or other subjects unless that information is explicitly present in the Retrieved Context.

27. If multiple retrieved sources describe DIFFERENT studies, experiments, datasets, methods, results, or values that could answer the question differently, do NOT arbitrarily choose one source.

28. When different uploaded documents provide different answers, identify the relevant document or study and report each supported version separately.

29. If the retrieved sources clearly refer to different studies, preserve that distinction in your answer.

30. Never merge different studies, datasets, experiments, methods, or results into one unsupported conclusion.

31. If the question is ambiguous and the retrieved documents contain multiple different answers, explain the ambiguity using ONLY the retrieved evidence.

32. Every factual claim must cite the SPECIFIC source that directly supports the claim.

33. Do not cite a source merely because it is related to the topic.

34. If a source is not used to support a claim in the final answer, do NOT cite that source.

35. Use [Source N] citations exactly as provided in the Retrieved Context.

36. Do not create citation numbers that do not exist in the Retrieved Context.

37. If two sources contain different values or findings, do not decide which one is correct unless the Retrieved Context itself explicitly establishes that.

38. If different sources describe different studies, use the document name or study context to make the distinction clear.

39. If the evidence is insufficient to determine whether two conflicting claims refer to the same study or context, do not merge them.

40. Keep every citation as close as possible to the claim it supports.

41. Do not add a Sources section to your answer. Citations will be displayed separately by the application.

42. Before adding a citation, verify that the cited source directly contains the evidence for the exact claim immediately before it.

43. Do not add multiple citations when one source directly supports the claim.

44. If only one retrieved source directly supports a claim, cite only that source.

45. Never cite a source merely because it discusses the same topic.

46. Do not add comparative descriptions unless those exact facts are explicitly supported by the Retrieved Context.

47. When answering a question about multiple studies, clearly separate each study and its dataset. Never merge facts from different studies.

48. If the question asks for a dataset, report the dataset name and only directly supported dataset details.

49. Do not infer dataset characteristics from the number of samples, file format, study type, or source.

50. After drafting the answer, internally verify every factual sentence against its cited source.

51. The retrieved sources have already been ranked using semantic similarity, evidence relevance, document identity, study/topic relevance, dataset evidence, and dataset directness.

52. A source containing phrases such as "related work", "previous work", "similar work", "same dataset", or references to another study should not be used to answer a question about the current study unless the Retrieved Context clearly establishes that it is the current study's evidence.

53. When one retrieved source directly states the answer and another source only discusses related or similar work, use the direct source only.

54. Do not cite a source solely because its similarity score is high.

55. If a lower-ranked source contains the direct evidence and a higher-ranked source only contains related information, use the direct-evidence source.

56. If the question explicitly names a document, paper, or study, prioritize retrieved evidence from that document when it directly answers the question.

57. Do not use a different document to answer an explicitly document-specific question merely because its semantic similarity score is higher.

58. If the question refers to multiple studies or papers, keep evidence from different documents separate.

59. If different documents provide different dataset names, report them separately with their document names rather than merging them.

60. For dataset questions, prefer passages that explicitly state the dataset used by the study over passages that merely mention, compare, or cite datasets.

61. Dataset mentions inside related work, previous work, references, examples, or comparisons should NOT be treated as the current study's dataset unless the text explicitly connects that dataset to the current study.

62. If a dataset passage explicitly says that the study obtained, used, collected, downloaded, or conducted experiments on a named dataset, prefer that passage over a passage that only mentions another dataset name.

63. If the question asks "What dataset was used?", identify the dataset name from the most direct dataset statement in the retrieved context.

64. Do not choose a dataset merely because its name appears more frequently.

65. If the retrieved context contains multiple dataset names, determine which one is explicitly connected to the current study's experiments, training, testing, validation, data loading, or model development. If that cannot be determined from the retrieved context, use the exact fallback sentence.

66. For multiple studies, report the dataset explicitly connected to each study separately.

67. When a document is explicitly named in the question, evidence from that document has priority when it directly answers the question.

68. Do not use another document to override direct evidence from the explicitly named document.

69. For a single-study dataset question, do NOT return multiple dataset names unless the Retrieved Context explicitly states that the same study used multiple datasets.

70. When several chunks from the same document mention different dataset names, prefer the dataset explicitly connected to the study's data loading, experiments, training, testing, validation, or model development.

71. A dataset name mentioned only in background discussion, comparison, related work, previous work, or discussion of another dataset must NOT automatically become the answer to "What dataset was used?"

72. When a passage explicitly identifies a named dataset as the dataset used by the current study, treat that statement as stronger evidence than a passage that only says another dataset exists, was analyzed, was referenced, or was mentioned.

73. If the current study's dataset is explicitly introduced in a Dataset, Data Loading, Materials and Methods, Experiments, Training, Testing, or Validation section, prefer that evidence.

74. Do not select a dataset solely because the dataset name is semantically similar to the question.

75. Do not select a dataset solely because it has a higher vector similarity than a passage containing a direct current-study dataset statement.

76. If a retrieved passage clearly describes a dataset belonging to another study, previous study, comparison study, or related work, treat that dataset as indirect evidence unless the same passage explicitly connects it to the current study.

77. For an explicitly named document, if that document contains a direct dataset-use statement, do not replace it with a dataset name from another document.

78. If the Retrieved Context contains multiple direct dataset-use statements for the same study, report all of them only when the context explicitly indicates that the study used multiple datasets.

79. Never infer that two differently named datasets are the same dataset.

80. Never infer that a dataset mentioned near the study description was necessarily used by the study unless the text explicitly connects it to the study.

81. For a single-study dataset question, do not return multiple dataset names unless the context explicitly states that the same study used multiple datasets.

82. When chunks from one document mention different dataset names, prefer the dataset explicitly connected to data loading, experiments, model development, training, testing, or validation.

83. A dataset mentioned only in background, related work, previous work, a comparison, references, or another study must not automatically become the answer.

84. When the question asks what dataset was obtained from Kaggle, prioritize direct evidence connecting the named dataset to obtaining, downloading, acquiring, or collecting it from Kaggle.

85. Never select a dataset merely because its name appears more frequently or because its chunk has higher semantic similarity.

Retrieved Context:

${contextText}

Question:

${cleanQuestion}

Answer:
`;

      // ------------------------------------------------
      // Generate answer
      // ------------------------------------------------

      const response =
        await llm.invoke(
          fullPrompt
        );

      // MULTI-STUDY DEBUG: Log raw response
      if (multiStudy) {
        console.log('\n[MULTI-STUDY DEBUG] ==========================================');
        console.log('[MULTI-STUDY DEBUG] Groq raw response received');
        console.log(`[MULTI-STUDY DEBUG] Response type: ${typeof response}`);
        console.log(`[MULTI-STUDY DEBUG] Response.content type: ${typeof response?.content}`);
        console.log(`[MULTI-STUDY DEBUG] Response.content value:`, response?.content);
        console.log('[MULTI-STUDY DEBUG] ==========================================\n');
      }

      // SAFE RESPONSE EXTRACTION
      let rawAnswer = '';
      
      if (response && response.content) {
        if (typeof response.content === 'string') {
          rawAnswer = response.content.trim();
        } else if (response.content && typeof response.content === 'object') {
          rawAnswer = JSON.stringify(response.content).trim();
        }
      }

      // Fallback if no valid response
      const answer =
        rawAnswer && rawAnswer.length > 0
          ? rawAnswer
          : FALLBACK_ANSWER;

      // MULTI-STUDY DEBUG: Log extracted answer
      if (multiStudy) {
        console.log('\n[MULTI-STUDY DEBUG] ==========================================');
        console.log('[MULTI-STUDY DEBUG] Extracted answer');
        console.log(`[MULTI-STUDY DEBUG] Answer length: ${answer.length}`);
        console.log(`[MULTI-STUDY DEBUG] Answer preview: ${answer.substring(0, 200)}`);
        console.log('[MULTI-STUDY DEBUG] ==========================================\n');
      }

      // ------------------------------------------------
      // Fallback handling
      // ------------------------------------------------

      const normalizedAnswer =
        normalizeAnswer(
          answer
        );

      const normalizedFallback =
        normalizeAnswer(
          FALLBACK_ANSWER
        );

      const isFallbackAnswer =
        normalizedAnswer ===
        normalizedFallback;

      let finalCitations = [];

      if (
        isFallbackAnswer
      ) {
        console.log(
          '[RAG] Model returned fallback answer.'
        );

        finalCitations = [];
      } else {
        finalCitations =
          filterUsedCitations(
            citations,
            answer
          );

        if (
          finalCitations.length === 0
        ) {
          console.warn(
            '[RAG] Model returned an answer without valid source citations.'
          );

          console.warn(
            '[RAG] Returning exact fallback instead.'
          );

          return res.json({
            answer:
              FALLBACK_ANSWER,

            citations: [],

            usage: null,
          });
        }

        console.log(
          `[RAG] Model returned supported answer with ${finalCitations.length} citation(s).`
        );
      }

      // ------------------------------------------------
      // Estimated token usage
      // ------------------------------------------------

      const estimatedPromptTokens =
        Math.ceil(
          fullPrompt.length / 4
        );

      const estimatedCompletionTokens =
        Math.ceil(
          answer.length / 4
        );

      const totalTokens =
        estimatedPromptTokens +
        estimatedCompletionTokens;

      console.log(
        `[Chat] Estimated tokens: ${totalTokens}`
      );

      console.log(
        `================================================\n`
      );

      // FINAL SAFETY CHECK: Never return undefined
      const finalAnswer = answer && typeof answer === 'string' && answer.length > 0
        ? answer
        : FALLBACK_ANSWER;

      const finalCitationsArray = Array.isArray(finalCitations) ? finalCitations : [];

      return res.json({
        answer: finalAnswer,

        citations:
          finalCitationsArray,

        usage: {
          promptTokens:
            estimatedPromptTokens,

          completionTokens:
            estimatedCompletionTokens,

          totalTokens,

          modelUsed:
            model,
        },
      });
    } catch (error) {
      console.error(
        '[RAG Chat Error]',
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate AI response.',
      });
    }
  }
);

// ======================================================
// Document Library
// ======================================================

app.get(
  '/api/documents',
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            file_type AS "fileType",
            file_size AS "fileSize",
            chunks_count AS "chunksCount",
            status,
            uploaded_at AS "uploadedAt"
          FROM documents
          ORDER BY uploaded_at DESC;
          `
        );

      return res.json({
        documents:
          result.rows,
      });
    } catch (error) {
      console.error(
        '[Documents Error]',
        error
      );

      return res.status(500).json({
        error:
          'Failed to load documents.',
      });
    }
  }
);

// ======================================================
// Health Check
// ======================================================

app.get(
  '/api/health',
  async (req, res) => {
    try {
      await pool.query(
        'SELECT 1 AS ok;'
      );

      const documentResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS documents
          FROM documents
          WHERE status = 'ready';
          `
        );

      const chunkResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS chunks
          FROM document_chunks;
          `
        );

      return res.json({
        status: 'ok',

        service:
          'RAG Studio Engine',

        database:
          'connected',

        pgvector:
          'enabled',

        models: {
          main:
            MAIN_MODEL,

          fast:
            FAST_MODEL,
        },

        embedding: {
          model:
            EMBEDDING_MODEL,

          dimensions:
            EMBEDDING_DIMENSIONS,
        },

        rag: {
          searchCandidates:
            RAG_SEARCH_LIMIT,

          datasetCandidates:
            DATASET_SEARCH_LIMIT,

          minimumSimilarity:
            MIN_SIMILARITY,

          minimumEvidenceScore:
            MIN_EVIDENCE_SCORE,

          documentIdentityWeight:
            DOCUMENT_IDENTITY_WEIGHT,

          datasetEvidenceWeight:
            DATASET_EVIDENCE_WEIGHT,

          datasetDirectnessWeight:
            DATASET_DIRECTNESS_WEIGHT,
        },

        documents:
          documentResult.rows[0]
            .documents,

        chunks:
          chunkResult.rows[0]
            .chunks,

        vectorStoreReady:
          true,
      });
    } catch (error) {
      console.error(
        '[Health Error]',
        error
      );

      return res.status(500).json({
        status: 'error',

        service:
          'RAG Studio Engine',

        database:
          'disconnected',

        error:
          error instanceof Error
            ? error.message
            : 'Database health check failed.',
      });
    }
  }
);

// ======================================================
// Start Server
// ======================================================

app.listen(
  PORT,
  () => {
    console.log(
      `\n🚀 RAG Studio Engine running on http://localhost:${PORT}`
    );

    console.log(
      `[Models] Main: ${MAIN_MODEL}`
    );

    console.log(
      `[Models] Fast: ${FAST_MODEL}`
    );

    console.log(
      `[Embedding] ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}D)`
    );

    console.log(
      '[Storage] PostgreSQL + pgvector'
    );

    console.log(
      `[RAG] Search candidates: ${RAG_SEARCH_LIMIT}`
    );

    console.log(
      `[RAG] Dataset candidates: ${DATASET_SEARCH_LIMIT}`
    );

    console.log(
      `[RAG] Minimum similarity: ${MIN_SIMILARITY}`
    );

    console.log(
      `[RAG] Minimum evidence score: ${MIN_EVIDENCE_SCORE}`
    );

    console.log(
      `[RAG] Document identity weight: ${DOCUMENT_IDENTITY_WEIGHT}`
    );

    console.log(
      `[RAG] Dataset evidence weight: ${DATASET_EVIDENCE_WEIGHT}`
    );

    console.log(
      `[RAG] Dataset directness weight: ${DATASET_DIRECTNESS_WEIGHT}`
    );
  }
);