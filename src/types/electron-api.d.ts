export {};

declare global {
  interface Window {
    electron: {
      saveCsv(csv: string): Promise<{ success: boolean; path?: string }>;
      savePdf(data: unknown): Promise<{ success: boolean; path?: string }>;
    };
  }
}