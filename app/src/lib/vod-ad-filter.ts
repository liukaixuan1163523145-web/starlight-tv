/** Filter only explicitly named, bounded ad groups in plain VOD playlists.
 * Duration/discontinuity alone never proves that footage is advertising.
 * Encryption, byte ranges, fMP4 and live playlists are left unchanged.
 */
export function filterExplicitVodAds(content: string, base: string): string {
  if (!/^#EXTM3U/m.test(content) || !/^#EXT-X-ENDLIST\s*$/m.test(content) ||
      /^#EXT-X-(?:KEY|MAP|BYTERANGE|STREAM-INF|DATERANGE|PART|SKIP)(?=:|$)/m.test(content)) return content;
  const lines = content.split('\n');
  const boundaries = lines.flatMap((line, i) => line.trim() === '#EXT-X-DISCONTINUITY' ? [i] : []);
  const remove = new Set<number>();
  for (let b = 0; b + 1 < boundaries.length; b++) {
    const start = boundaries[b], end = boundaries[b + 1];
    const group = lines.slice(start + 1, end);
    const uris = group.map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const durations = group.filter(l => l.trim().startsWith('#EXTINF:')).map(l => Number(l.trim().slice(8).split(',')[0]));
    if (!uris.length || durations.length !== uris.length || durations.some(n => !Number.isFinite(n) || n <= 0) || durations.reduce((a,b) => a+b,0) > 90) continue;
    if (!uris.every(uri => {
      try { return /\/(?:adjump|ads?|advert|advertisement)\//i.test(new URL(uri, base).pathname); }
      catch { return false; }
    })) continue;
    // Leave unknown control tags intact by declining to filter that entire group.
    if (group.some(l => l.trim().startsWith('#') && !l.trim().startsWith('#EXTINF:'))) continue;
    for (let i = start; i < end; i++) remove.add(i);
  }
  if (!remove.size) return content;
  const remaining = lines.filter((_, i) => !remove.has(i));
  if (!remaining.some(l => l.trim() && !l.trim().startsWith('#'))) return content;
  return remaining.join('\n');
}
