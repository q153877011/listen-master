export interface AudioRecord {
  id: string;
  text: string | null;
  audio_path: string;
  file_size: number;
  folder_name: string;
  file_name: string;
  miss_text: string | null;
  chinese: string | null;
  original_text: string | null;
  created_at: string;
}

// Re-export AudioRecord as AudioResult for backward compatibility
export type AudioResult = AudioRecord; 