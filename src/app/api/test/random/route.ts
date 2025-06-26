import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { AudioRecord } from '@/types/audio';

type AudioTest = Pick<AudioRecord, 'id' | 'audio_path' | 'miss_text' | 'original_text' | 'chinese'>;

export async function GET() {
  try {
    const db = (await getCloudflareContext({ async: true })).env.DB;
    
    // Get a random test that has all required fields
    const { results } = await db.prepare(`
      SELECT id, audio_path, miss_text, original_text, chinese
      FROM audio
      WHERE miss_text IS NOT NULL 
      AND original_text IS NOT NULL 
      AND chinese IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).all();

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No tests available"
      }, { status: 404 });
    }

    const test: AudioTest = {
      id: String(results[0].id),
      audio_path: String(results[0].audio_path),
      miss_text: results[0].miss_text as string,
      original_text: results[0].original_text as string,
      chinese: results[0].chinese as string
    };

    // Validate that all required fields are present
    if (!test.miss_text || !test.original_text || !test.chinese) {
      return NextResponse.json({
        success: false,
        message: "Invalid test data"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error fetching random test:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 