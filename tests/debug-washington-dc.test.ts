import { describe, it } from 'vitest';
import { parseLocation } from '../client/src/lib/locationParser';

describe('Debug Washington DC', () => {
  it('should parse Washington DC-Baltimore Area', () => {
    const result = parseLocation('Washington DC-Baltimore Area');
    console.log('\n=== Washington DC-Baltimore Area ===');
    console.log(JSON.stringify(result, null, 2));
  });
});
