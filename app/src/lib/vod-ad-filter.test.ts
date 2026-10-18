import { describe, expect, it } from 'vitest';
import { filterExplicitVodAds } from './vod-ad-filter';
const base='https://cdn.example/video/index.m3u8';
const fixture=(ad='ads/clip.ts')=>['#EXTM3U','#EXT-X-TARGETDURATION:10','#EXTINF:10,','main1.ts','#EXT-X-DISCONTINUITY','#EXTINF:8,',ad,'#EXT-X-DISCONTINUITY','#EXTINF:10,','main2.ts','#EXT-X-ENDLIST'].join('\n');
describe('explicit VOD ad filter',()=>{
 it('removes a bounded ad group and retains main content and its boundary',()=>{const out=filterExplicitVodAds(fixture(),base);expect(out).not.toContain('ads/clip.ts');expect(out).toContain('main1.ts');expect(out).toContain('main2.ts');expect(out).toContain('#EXT-X-ENDLIST');expect(out.match(/#EXT-X-DISCONTINUITY/g)).toHaveLength(1);});
 it.each(['scene.ts','shadow.ts','scene.ts?advert=1','https://advert.example/video/normal.ts'])('preserves short normal groups %s',uri=>{const input=fixture(uri);expect(filterExplicitVodAds(input,base)).toBe(input);});
 it.each(['#EXT-X-KEY:METHOD=AES-128,URI="key"','#EXT-X-MAP:URI="init.mp4"','#EXT-X-BYTERANGE:100@0','#EXT-X-DATERANGE:ID="normal"'])('preserves unsupported state %s',tag=>{const input=fixture().replace('#EXTM3U','#EXTM3U\n'+tag);expect(filterExplicitVodAds(input,base)).toBe(input);});
 it('never modifies live playlists',()=>{const input=fixture().replace('#EXT-X-ENDLIST','');expect(filterExplicitVodAds(input,base)).toBe(input);});
 it('keeps a mixed ad/main group',()=>{const input=fixture().replace('ads/clip.ts','ads/clip.ts\n#EXTINF:2,\nnormal.ts');expect(filterExplicitVodAds(input,base)).toBe(input);});
 it('does not guess unmarked pre-roll',()=>{const input=fixture('intro.ts');expect(filterExplicitVodAds(input,base)).toBe(input);});
});
