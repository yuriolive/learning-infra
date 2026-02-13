import { describe, it, expect, vi, beforeEach } from "vitest";
import NeonSearchService from "../neon-search.js";

const mockGenAI = {
  models: {
    embedContent: vi.fn(),
  },
};

// Mock @google/genai as a class constructor
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor() {
        return mockGenAI;
      }
    },
  };
});

describe("NeonSearchService", () => {
  let service: NeonSearchService;
  let loggerMock: any;
  let managerMock: any;

  const options = {
    gemini_api_key: "test_key",
  };

  beforeEach(() => {
    loggerMock = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    managerMock = {
      execute: vi.fn(),
    };

    mockGenAI.models.embedContent.mockReset();
    mockGenAI.models.embedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }]
    });

    service = new NeonSearchService(
      { logger: loggerMock, manager: managerMock },
      options
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should throw if api key missing", () => {
    expect(() => {
      new NeonSearchService(
        { logger: loggerMock, manager: managerMock },
        {} as any
      );
    }).toThrow("Gemini API key is required");
  });

  describe("createIndex", () => {
    it("should create table and index", async () => {
      managerMock.execute.mockResolvedValue(undefined);

      await service.createIndex("products");

      expect(managerMock.execute).toHaveBeenCalledTimes(2);
      expect(managerMock.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("CREATE TABLE IF NOT EXISTS search_index_products")
      );
      expect(managerMock.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("CREATE INDEX IF NOT EXISTS search_index_products_idx")
      );
    });

    it("should handle index creation error if not 'already exists'", async () => {
      managerMock.execute
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Some other error"));

      await service.createIndex("products");

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create ParadeDB index")
      );
    });

    it("should ignore 'already exists' error", async () => {
      managerMock.execute
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("relation ... already exists"));

      await service.createIndex("products");

      expect(loggerMock.warn).not.toHaveBeenCalled();
    });
  });

  describe("addDocuments", () => {
    it("should add documents with embeddings", async () => {
      const documents = [
        { id: "1", title: "Product 1", description: "Desc 1" },
      ];

      await service.addDocuments("products", documents);

      expect(mockGenAI.models.embedContent).toHaveBeenCalled();
      expect(managerMock.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO search_index_products"),
        expect.arrayContaining(["1", documents[0], "[0.1,0.2,0.3]"])
      );
    });

    it("should skip document with empty text", async () => {
       const documents = [{ id: "3", title: "", description: "" }];
       await service.addDocuments("products", documents);
       expect(mockGenAI.models.embedContent).not.toHaveBeenCalled();
       expect(managerMock.execute).not.toHaveBeenCalled();
    });

    it("should handle embedding failure", async () => {
       const documents = [{ id: "4", title: "Fail", description: "Fail" }];
       mockGenAI.models.embedContent.mockRejectedValue(new Error("API Error"));

       await service.addDocuments("products", documents);

       expect(loggerMock.error).toHaveBeenCalledWith(
         expect.stringContaining("Failed to add document 4")
       );
    });

    it("should handle missing embedding values", async () => {
       const documents = [{ id: "5", title: "Empty", description: "Empty" }];
       mockGenAI.models.embedContent.mockResolvedValue({}); // no embeddings

       await service.addDocuments("products", documents);

       expect(loggerMock.error).toHaveBeenCalledWith(
         expect.stringContaining("No embedding returned")
       );
    });
  });

  describe("search", () => {
    it("should search documents", async () => {
      managerMock.execute.mockResolvedValue([
        { doc: { id: "1", title: "Match" }, final_score: 0.9 }
      ]);

      const results = await service.search("products", "query text", { limit: 5 });

      expect(mockGenAI.models.embedContent).toHaveBeenCalledWith(
        expect.objectContaining({ contents: "query text" })
      );

      // Check SQL parameters
      // SQL uses ? placeholders.
      // [vectorString, query, vectorString, limit]
      const vectorString = "[0.1,0.2,0.3]";
      expect(managerMock.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT doc"),
        [vectorString, "query text", vectorString, 5]
      );

      expect(results).toEqual([{ id: "1", title: "Match" }]);
    });
  });

  describe("deleteDocument", () => {
    it("should delete document", async () => {
      await service.deleteDocument("products", "123");
      expect(managerMock.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM search_index_products WHERE id = ?"),
        ["123"]
      );
    });
  });

  describe("deleteAllDocuments", () => {
    it("should delete all documents", async () => {
      await service.deleteAllDocuments("products");
      expect(managerMock.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM search_index_products")
      );
    });
  });

  describe("replaceDocuments", () => {
    it("should replace documents (calls addDocuments)", async () => {
      const spy = vi.spyOn(service, "addDocuments").mockImplementation(async () => {});
      await service.replaceDocuments("products", []);
      expect(spy).toHaveBeenCalledWith("products", []);
    });
  });

  describe("getIndex", () => {
      it("should be no-op", async () => {
          await expect(service.getIndex("products")).resolves.toBeUndefined();
      });
  });

  describe("updateSettings", () => {
      it("should be no-op", async () => {
          await expect(service.updateSettings("products", {})).resolves.toBeUndefined();
      });
  });
});
