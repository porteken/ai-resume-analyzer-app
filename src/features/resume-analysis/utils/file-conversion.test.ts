/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import { convertFileToBase64 } from "@/features/resume-analysis/utils/file-conversion";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type FileReaderMode =
  | "error"
  | "missing-base64"
  | "non-string-result"
  | "success";

const originalFileReader = globalThis.FileReader;

let fileReaderMode: FileReaderMode = "success";

class MockFileReader {
  public result: ArrayBuffer | null | string = null;

  private readonly listeners = new Map<string, Set<() => void>>();

  public addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public readAsDataURL(): void {
    queueMicrotask(() => {
      if (fileReaderMode === "error") {
        this.emit("error");
        return;
      }

      if (fileReaderMode === "non-string-result") {
        this.result = new ArrayBuffer(8);
        this.emit("load");
        return;
      }

      this.result =
        fileReaderMode === "missing-base64"
          ? "data:application/pdf;base64,"
          : "data:application/pdf;base64,QUJDREVGRw==";
      this.emit("load");
    });
  }

  private emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

describe("file conversion", () => {
  beforeEach(() => {
    fileReaderMode = "success";
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
  });

  it("returns the base64 payload from the file reader result", async () => {
    const file = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });

    await expect(convertFileToBase64(file)).resolves.toBe("QUJDREVGRw==");
  });

  it("rejects when the file reader returns a non-string result", async () => {
    fileReaderMode = "non-string-result";

    await expect(
      convertFileToBase64(
        new File(["pdf-content"], "resume.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("File reading failed");
  });

  it("rejects when the file reader result does not include base64 content", async () => {
    fileReaderMode = "missing-base64";

    await expect(
      convertFileToBase64(
        new File(["pdf-content"], "resume.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("File reading failed");
  });

  it("rejects when the file reader emits an error", async () => {
    fileReaderMode = "error";

    await expect(
      convertFileToBase64(
        new File(["pdf-content"], "resume.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("File reading failed");
  });
});
