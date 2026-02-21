import { describe, expect, it } from "vitest";

import { convertFileToBase64, sleep, validateFile } from "@/lib/resume-utils";
import { createMockFile } from "@/tests/mocks/file";

describe("Helper Functions", () => {
  describe("sleep", () => {
    it("should delay execution", async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(95);
    });
  });

  describe("convertFileToBase64", () => {
    it("should convert file to base64", async () => {
      const file = createMockFile("test content", "test.pdf");

      const base64 = await convertFileToBase64(file);

      expect(base64).toBeDefined();
      expect(typeof base64).toBe("string");
      expect(base64.length).toBeGreaterThan(0);
    });

    it("should handle file reading errors", async () => {
      const originalFileReader = globalThis.FileReader;

      interface MockFileReaderEvent {
        target: MockFileReader;
      }

      type EventCallback = (event: MockFileReaderEvent) => void;

      class MockFileReader {
        error: DOMException = new DOMException("Read error");
        result: ArrayBuffer | null | string = null;
        private listeners: Record<string, EventCallback[]> = {};

        addEventListener(event: string, callback: EventCallback) {
          if (!this.listeners[event]) {
            this.listeners[event] = [];
          }
          this.listeners[event].push(callback);
        }

        readAsDataURL() {
          setTimeout(() => {
            this.dispatchEvent("error");
          }, 0);
        }

        private dispatchEvent(event: string) {
          if (this.listeners[event]) {
            for (const callback of this.listeners[event])
              callback({ target: this });
          }
        }
      }

      globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

      const file = createMockFile("test content", "test.pdf");

      await expect(convertFileToBase64(file)).rejects.toThrow(
        "File reading failed",
      );

      globalThis.FileReader = originalFileReader;
    });
  });

  describe("validateFile", () => {
    it("should return error for null file", () => {
      const result = validateFile(null);
      expect(result).toBe(
        "Please provide both a PDF resume and a Job Description.",
      );
    });

    it("should return null for valid file", () => {
      const file = createMockFile("test content", "test.pdf");
      const result = validateFile(file);
      expect(result).toBeNull();
    });

    it("should return error for non-PDF file", () => {
      const file = createMockFile("test content", "resume.txt", "text/plain");
      const result = validateFile(file);
      expect(result).toBe("Please upload a PDF file.");
    });

    it("should return error for file larger than 5MB", () => {
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const file = createMockFile(largeContent, "large.pdf");

      const result = validateFile(file);
      expect(result).toContain("File too large");
      expect(result).toContain("Please use a PDF smaller than 5MB");
    });

    it("should accept file exactly at 5MB limit", () => {
      const content = "x".repeat(5 * 1024 * 1024);
      const file = createMockFile(content, "exact.pdf");

      const result = validateFile(file);
      expect(result).toBeNull();
    });
  });
});
