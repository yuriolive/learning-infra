import { GoogleGenAI } from "@google/genai";
import { Logger } from "@medusajs/types";
import { ISearchService } from "@medusajs/types";

type InjectedDependencies = {
  logger: Logger;
  manager: any;
};

type NeonSearchOptions = {
  gemini_api_key: string;
};

export default class NeonSearchService implements ISearchService {
  static identifier = "neon-search";
  protected logger_: Logger;
  protected manager_: any;
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

  async createIndex(indexName: string, options?: unknown): Promise<void> {
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
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        this.logger_.warn(`Failed to create ParadeDB index for ${indexName}: ${e.message}`);
      }
    }
  }

  async addDocuments(indexName: string, documents: any[]): Promise<void> {
    for (const doc of documents) {
      const text = (doc.title || "") + " " + (doc.description || "");
      if (!text.trim()) continue;

      try {
        const result = await this.genAI.models.embedContent({
          model: "gemini-embedding-001",
          contents: text,
          config: { outputDimensionality: 768 },
        });

        const embeddingValues = result.embeddings?.[0]?.values;

        if (!embeddingValues) {
            throw new Error("No embedding returned");
        }

        const vectorStr = `[${embeddingValues.join(",")}]`;

        await this.manager_.execute(
          `INSERT INTO search_index_${indexName} (id, doc, embedding)
           VALUES (?, ?, ?::vector)
           ON CONFLICT (id) DO UPDATE SET
             doc = EXCLUDED.doc,
             embedding = EXCLUDED.embedding`,
          [doc.id, doc, vectorStr]
        );
      } catch (error: any) {
        this.logger_.error(`Failed to add document ${doc.id} to index ${indexName}: ${error.message}`);
      }
    }
  }

  async replaceDocuments(indexName: string, documents: any[]): Promise<void> {
      await this.addDocuments(indexName, documents);
  }

  async search(indexName: string, query: string, options?: any): Promise<any> {
    const result = await this.genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: query,
      config: { outputDimensionality: 768 },
    });

    const embeddingValues = result.embeddings?.[0]?.values;

    if (!embeddingValues) {
         throw new Error("No embedding returned for query");
    }

    const vectorStr = `[${embeddingValues.join(",")}]`;

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

    const res = await this.manager_.execute(sql, [vectorStr, query, vectorStr, limit]);

    return res.map((r: any) => r.doc);
  }

  async deleteDocument(indexName: string, document_id: string): Promise<void> {
    await this.manager_.execute(`DELETE FROM search_index_${indexName} WHERE id = ?`, [document_id]);
  }

  async deleteAllDocuments(indexName: string): Promise<void> {
    await this.manager_.execute(`DELETE FROM search_index_${indexName}`);
  }

  async getIndex(indexName: string): Promise<void> {
    // No-op
  }

  async updateSettings(indexName: string, settings: any): Promise<void> {
     // No-op
  }
}
