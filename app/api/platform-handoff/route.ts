import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET() {
  const text = await readFile(
    path.join(process.cwd(), 'docs', 'FORGE_AI_USER_MANUAL.md'),
    'utf8',
  );
  return new Response(text, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="FORGE_AI_USER_MANUAL.md"',
    },
  });
}
