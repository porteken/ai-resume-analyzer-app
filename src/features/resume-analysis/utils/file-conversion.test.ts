import { convertFileToBase64 } from "@/features/resume-analysis/utils/file-conversion";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type FileReaderMode =
  | "error"
  | "missing-base64"
  | "non-string-result"
  | "success";

const originalFileReader = globalThis.FileReader;

let fileReaderMode: FileReaderMode;

type MockFileReaderInstance = {
  result: ArrayBuffer | null | string;
} & Record<"addEventListener", (type: string, listener: () => void) => void> &
  Record<"readAsDataURL", (file: Blob) => void>;

const createMockFileReader = (): MockFileReaderInstance => {
  const listeners = new Map<string, Set<() => void>>();

  const emit = (type: string): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener();
    }
  };

  const reader = {
    result: null,
    ...Object.fromEntries([
      [
        "addEventListener",
        (type: string, listener: () => void): void => {
          const eventListeners = listeners.get(type) ?? new Set<() => void>();
          eventListeners.add(listener);
          listeners.set(type, eventListeners);
        },
      ],
      [
        "readAsDataURL",
        (_file: Blob): void => {
          queueMicrotask(() => {
            if (fileReaderMode === "error") {
              emit("error");
              return;
            }

            if (fileReaderMode === "non-string-result") {
              reader.result = new ArrayBuffer(8);
              emit("load");
              return;
            }

            reader.result =
              fileReaderMode === "missing-base64"
                ? "data:application/pdf;base64,"
                : "data:application/pdf;base64,QUJDREVGRw==";
            emit("load");
          });
        },
      ],
    ]),
  } as MockFileReaderInstance;

  return reader;
};

describe("file conversion", () => {
  beforeEach(() => {
    fileReaderMode = "success";
    globalThis.FileReader = function MockFileReader() {
      return createMockFileReader();
    } as unknown as typeof FileReader;
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

  it.each([
    { mode: "non-string-result", scenario: "returns a non-string result" },
    { mode: "missing-base64", scenario: "returns no base64 content" },
    { mode: "error", scenario: "emits an error" },
  ] satisfies { mode: FileReaderMode; scenario: string }[])(
    "rejects when the file reader $scenario",
    async ({ mode }) => {
      fileReaderMode = mode;

      await expect(
        convertFileToBase64(
          new File(["pdf-content"], "resume.pdf", { type: "application/pdf" }),
        ),
      ).rejects.toThrow("File reading failed");
    },
  );
});
