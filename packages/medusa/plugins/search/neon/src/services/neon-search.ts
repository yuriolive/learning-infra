import { GoogleGenAI } from "@google/genai";

import type { Logger } from "@medusajs/types";
import type { ISearchService } from "@medusajs/types";

interface InjectedDependencies {
  logger: Logger;
  manager: EntityManager;
}

interface NeonSearchOptions extends Record<string, unknown> {
  gemini_api_key: string;
}

interface EntityManager {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
}

export default class NeonSearchService implements ISearchService {
  static identifier = "neon-search";
  protected logger_: Logger;
  protected manager_: EntityManager;
  protected genAI: GoogleGenAI;
  public options: NeonSearchOptions;

  constructor(container: InjectedDependencies, options: NeonSearchOptions) {
    this.logger_ = container.logger;
    this.manager_ = container.manager;
    this.options = options;

    if (!options.gemini_api_key) {
      throw new Error("Gemini API key is required in options");
    }

    this.genAI = new GoogleGenAI({ apiKey: options.gemini_api_key });
  }

  async createIndex(indexName: string, _options?: unknown): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS search_index_${indexName} (
        id VARCHAR(255) PRIMARY KEY,
        doc JSONB,
        search_text TEXT GENERATED ALWAYS AS (
          doc ->> 'title' || ' ' || coalesce(doc ->> 'description', '')
        ) STORED,
        embedding vector(768)
      );
    `;
    await this.manager_.execute(sql);

    try {
      await this.manager_.execute(`
        CREATE INDEX IF NOT EXISTS search_index_${indexName}_idx ON search_index_${indexName}
        USING bm25 (id, search_text)
        WITH (key_field='id');
      `);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        !error.message?.includes("already exists")
      ) {
        this.logger_.warn(
          `Failed to create ParadeDB index for ${indexName}: ${error.message}`,
        );
      }
    }
  }

  async addDocuments(indexName: string, documents: unknown[]): Promise<void> {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
      const chunk = documents.slice(i, i + CHUNK_SIZE);
      await this.addDocumentsBatch(indexName, chunk);
    }
  }

  protected async addDocumentsBatch(
    indexName: string,
    documents: unknown[],
  ): Promise<void> {
    const validDocs: { id: string; doc: any; text: string }[] = [];

    for (const documentData of documents) {
      const document = documentData as Record<string, unknown>;
      const title = typeof document.title === "string" ? document.title : "";
      const description =
        typeof document.description === "string" ? document.description : "";
      const text = (title || "") + " " + (description || "");

      if (text.trim() && document.id) {
        validDocs.push({ id: document.id as string, doc: document, text });
      }
    }

    if (validDocs.length === 0) {
      return;
    }

    try {
      const results = await Promise.allSettled(
        validDocs.map((d) => this.getEmbedding(d.text)),
      );

      const itemsToInsert: { id: string; doc: any; vectorString: string }[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const docInfo = validDocs[i];
        if (result.status === "fulfilled") {
          itemsToInsert.push({
            id: docInfo.id,
            doc: docInfo.doc,
            vectorString: `[${result.value.join(",")}]`,
          });
        } else {
          this.logger_.error(
            `Failed to get embedding for document ${docInfo.id} in index ${indexName}: ${result.reason}`,
          );
        }
      }

      if (itemsToInsert.length === 0) {
        return;
      }

      const valuePlaceholders = itemsToInsert
        .map(() => `(?, ?, ?::vector)`)
        .join(", ");
      const sql = `
        INSERT INTO search_index_${indexName} (id, doc, embedding)
        VALUES ${valuePlaceholders}
        ON CONFLICT (id) DO UPDATE SET
          doc = EXCLUDED.doc,
          embedding = EXCLUDED.embedding
      `;

      const params: unknown[] = [];
      for (const item of itemsToInsert) {
        params.push(item.id, item.doc, item.vectorString);
      }

      await this.manager_.execute(sql, params);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger_.error(
        `Failed to add documents batch to index ${indexName}: ${errorMessage}`,
      );
    }
  }

  protected async addDocument(
    indexName: string,
    documentData: unknown,
  ): Promise<void> {
    await this.addDocuments(indexName, [documentData]);
  }

  protected async getEmbedding(text: string): Promise<number[]> {
    const result = await this.genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 768 },
    });

    const embeddingValues = result.embeddings?.[0]?.values;

    if (!embeddingValues) {
      throw new Error("No embedding returned");
    }

    return embeddingValues;
  }

  async replaceDocuments(
    indexName: string,
    documents: unknown[],
  ): Promise<void> {
    await this.addDocuments(indexName, documents);
  }

  async search(
    indexName: string,
    query: string,
    options?: Record<string, unknown>,
  ): Promise<unknown> {
    const embeddingValues = await this.getEmbedding(query);

    const vectorString = `[${embeddingValues.join(",")}]`;

    const limit = options?.limit || 10;

    const sql = `
        SELECT doc,
               (paradedb.score(id) * 0.5) + ((1 - (embedding <=> ?::vector)) * 0.5) as final_score
        FROM search_index_${indexName}
        WHERE id @@@ paradedb.match('search_text', ?, distance => 2)
           OR embedding <=> ?::vector < 0.5
        ORDER BY final_score DESC
        LIMIT ?
    `;

    const results = (await this.manager_.execute(sql, [
      vectorString,
      query,
      vectorString,
      limit,
    ])) as Array<Record<string, unknown>>;

    return results.map((r) => r.doc);
  }

  async deleteDocument(indexName: string, document_id: string): Promise<void> {
    await this.manager_.execute(
      `DELETE FROM search_index_${indexName} WHERE id = ?`,
      [document_id],
    );
  }

  async deleteAllDocuments(indexName: string): Promise<void> {
    await this.manager_.execute(`DELETE FROM search_index_${indexName}`);
  }

  async getIndex(_indexName: string): Promise<void> {
    // No-op
  }

  async updateSettings(_indexName: string, _settings: unknown): Promise<void> {
    // No-op
  }
}
