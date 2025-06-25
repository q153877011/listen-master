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

export interface AudioResult {
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