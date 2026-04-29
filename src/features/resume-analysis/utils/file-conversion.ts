export const convertFileToBase64 = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("File reading failed"));
        return;
      }

      const base64Content = reader.result.split(",")[1];
      if (!base64Content) {
        reject(new Error("File reading failed"));
        return;
      }

      resolve(base64Content);
    });

    reader.addEventListener("error", () => {
      reject(new Error("File reading failed"));
    });

    reader.readAsDataURL(file);
  });
