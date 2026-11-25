import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache in memory across invocations in serverless / node runtime
let cachedTeluguBible: any = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdxStr = searchParams.get('book');
    const chapterStr = searchParams.get('chapter');
    const verseStr = searchParams.get('verse');

    if (bookIdxStr === null || chapterStr === null || verseStr === null) {
      return NextResponse.json({ error: 'Missing book, chapter, or verse parameter' }, { status: 400 });
    }

    const bookIdx = parseInt(bookIdxStr, 10);
    const chapterNum = parseInt(chapterStr, 10);
    const verseNum = parseInt(verseStr, 10);

    if (isNaN(bookIdx) || isNaN(chapterNum) || isNaN(verseNum)) {
      return NextResponse.json({ error: 'Invalid numeric parameters' }, { status: 400 });
    }

    // 1. Fetch English Verse from bolls.life (KJV)
    let engText = '';
    const bookId = bookIdx + 1; // 1-indexed for bolls
    try {
      const bollsUrl = `https://bolls.life/get-text/KJV/${bookId}/${chapterNum}/`;
      const bollsResp = await fetch(bollsUrl, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 } // cache for 1 day
      });
      if (bollsResp.ok) {
        const result = await bollsResp.json();
        const verseObj = result.find((v: any) => v.verse === verseNum);
        if (verseObj && verseObj.text) {
          engText = verseObj.text
            .replace(/<[^>]*>?/gm, '')
            .replace(/\d+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    } catch (e) {
      console.warn('bolls.life fetch error:', e);
    }

    // 2. Lookup Telugu Verse from local telugu_bible.json
    let telText = '';
    try {
      if (!cachedTeluguBible) {
        const biblePath = path.join(process.cwd(), 'public', 'telugu_bible.json');
        if (fs.existsSync(biblePath)) {
          const raw = fs.readFileSync(biblePath, 'utf-8');
          cachedTeluguBible = JSON.parse(raw);
        }
      }

      if (cachedTeluguBible && cachedTeluguBible.Book) {
        const bookData = cachedTeluguBible.Book[bookIdx];
        if (bookData && bookData.Chapter && bookData.Chapter[chapterNum - 1]) {
          const chapterData = bookData.Chapter[chapterNum - 1].Verse;
          if (chapterData && chapterData[verseNum - 1]) {
            telText = chapterData[verseNum - 1].Verse || '';
          }
        }
      }
    } catch (e) {
      console.warn('Telugu bible lookup error:', e);
    }

    return NextResponse.json({
      success: true,
      bookIndex: bookIdx,
      chapter: chapterNum,
      verse: verseNum,
      engText,
      telText
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
