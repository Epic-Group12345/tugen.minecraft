import {
  isValidServerTarget,
  parseServerPage,
  parseServerTarget,
} from '../src/core/servers';

describe('server catalog parsing', () => {
  it('validates server records and ignores malformed entries', () => {
    expect(
      parseServerPage({
        total: 2,
        servers: [
          {
            name: 'Example',
            slug: 'example',
            ip: 'play.example.org',
            port: 25570,
            online: 42,
            isOnline: true,
            aiTagline: 'Survival  server',
            categories: ['SURVIVAL'],
            versionMajors: ['1.20', '1.21'],
          },
          { name: 'No address', slug: 'offline' },
          { name: 7, slug: 'bad' },
        ],
      }),
    ).toEqual({
      total: 2,
      count: 3,
      servers: [
        {
          slug: 'example',
          name: 'Example',
          rank: 1,
          address: 'play.example.org:25570',
          target: { address: 'play.example.org', port: 25570 },
          online: 42,
          averageOnline: 0,
          isOnline: true,
          description: 'Survival server',
          motd: '',
          version: '1.20, 1.21',
          versionSpan: '1.20 – 1.21',
          versions: ['1.20', '1.21'],
          category: 'SURVIVAL',
          modes: ['SURVIVAL'],
          edition: '',
          kind: '',
          access: '',
          logo: null,
          banner: null,
          cracked: false,
          isNew: false,
          boost: 0,
          votes: 0,
        },
        {
          slug: 'offline',
          name: 'No address',
          rank: 2,
          address: '',
          target: null,
          online: 0,
          averageOnline: 0,
          isOnline: false,
          description: '',
          motd: '',
          version: '',
          versionSpan: '',
          versions: [],
          category: '',
          modes: [],
          edition: '',
          kind: '',
          access: '',
          logo: null,
          banner: null,
          cracked: false,
          isNew: false,
          boost: 0,
          votes: 0,
        },
      ],
    });
  });

  it('rejects an invalid API envelope instead of returning an empty list', () => {
    expect(() => parseServerPage({ items: [] })).toThrow('нет списка серверов');
  });
});

describe('parseServerTarget', () => {
  it('parses hostnames, inline ports and IPv6 addresses', () => {
    expect(parseServerTarget('play.example.org')).toEqual({
      address: 'play.example.org',
      port: 25565,
    });
    expect(parseServerTarget('play.example.org', null)).toEqual({
      address: 'play.example.org',
      port: 25565,
    });
    expect(parseServerTarget('play.example.org:25570')).toEqual({
      address: 'play.example.org',
      port: 25570,
    });
    expect(parseServerTarget('[2001:db8::1]:25565')).toEqual({
      address: '2001:db8::1',
      port: 25565,
    });
    expect(parseServerTarget('2001:db8::1')).toEqual({
      address: '2001:db8::1',
      port: 25565,
    });
    expect(parseServerTarget(':::1')).toBeNull();
    expect(parseServerTarget('1::2::3')).toBeNull();
  });

  it('rejects unsafe hosts and invalid ports', () => {
    expect(parseServerTarget('example.org --port 4')).toBeNull();
    expect(parseServerTarget('example.org:70000')).toBeNull();
    expect(parseServerTarget('example.org', 0)).toBeNull();
    expect(isValidServerTarget({ address: 'example.org', port: 25565 })).toBe(
      true,
    );
    expect(
      isValidServerTarget({ address: 'example.org --server x', port: 25565 }),
    ).toBe(false);
  });
});
