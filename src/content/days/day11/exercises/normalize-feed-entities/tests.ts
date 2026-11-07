import { describe, it, expect } from 'vitest';
import { normalize, denormalize, type Post } from './solution';

const ada = { id: 'u1', name: 'Ada', avatarUrl: '/ada.png' };
const linus = { id: 'u2', name: 'Linus' };

function makeFeed(): Post[] {
  return [
    {
      id: 'p1',
      title: 'Hello',
      author: { ...ada },
      comments: [
        { id: 'c1', body: 'Nice', author: { ...linus } },
        { id: 'c2', body: 'Thanks!', author: { ...ada } },
      ],
    },
    {
      id: 'p2',
      title: 'Second post',
      author: { ...linus },
      comments: [{ id: 'c3', body: 'Hi Linus', author: { ...ada } }],
    },
  ];
}

describe('normalize', () => {
  it('stores each user once, even when it appears as post author and comment author', () => {
    const { entities } = normalize(makeFeed());
    expect(Object.keys(entities.users).sort()).toEqual(['u1', 'u2']);
    expect(entities.users.u1).toEqual(ada);
    expect(Object.keys(entities.posts).sort()).toEqual(['p1', 'p2']);
    expect(Object.keys(entities.comments).sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('replaces nested objects with ids and keeps the result order', () => {
    const { entities, result } = normalize(makeFeed());
    expect(result).toEqual(['p1', 'p2']);
    expect(entities.posts.p1).toEqual({ id: 'p1', title: 'Hello', author: 'u1', comments: ['c1', 'c2'] });
    expect(entities.comments.c3).toEqual({ id: 'c3', body: 'Hi Linus', author: 'u1' });
  });

  it('shallow-merges repeated copies of an entity: later fields win, missing fields are kept', () => {
    const feed = makeFeed();
    // the second copy of Ada is a partial "summary" user with a newer name and no avatar
    feed[1].comments[0].author = { id: 'u1', name: 'Ada L.' };
    const { entities } = normalize(feed);
    expect(entities.users.u1).toEqual({ id: 'u1', name: 'Ada L.', avatarUrl: '/ada.png' });
  });

  it('does not mutate the input or share object references with it', () => {
    const feed = makeFeed();
    const snapshot = JSON.parse(JSON.stringify(feed));
    const { entities } = normalize(feed);
    expect(feed).toEqual(snapshot);
    feed[0].author.name = 'mutated later';
    expect(entities.users.u1.name).toBe('Ada');

    // a user that appears only once must be copied too
    const solo: Post[] = [{ id: 'p9', title: 'Solo', author: { id: 'u9', name: 'Grace' }, comments: [] }];
    const normalized = normalize(solo);
    solo[0].author.name = 'mutated later';
    expect(normalized.entities.users.u9.name).toBe('Grace');
  });

  it('handles an empty page', () => {
    expect(normalize([])).toEqual({ entities: { posts: {}, users: {}, comments: {} }, result: [] });
  });
});

describe('denormalize', () => {
  it('round-trips: denormalize(normalize(x)) deep-equals x', () => {
    const feed = makeFeed();
    const { entities, result } = normalize(feed);
    expect(denormalize(result, entities)).toEqual(feed);
  });

  it('a single update to a user entity shows up everywhere that user is referenced', () => {
    const { entities, result } = normalize(makeFeed());
    entities.users.u1 = { ...entities.users.u1, name: 'Ada Lovelace' };
    const posts = denormalize(result, entities);
    expect(posts[0].author.name).toBe('Ada Lovelace');
    expect(posts[0].comments[1].author.name).toBe('Ada Lovelace');
    expect(posts[1].comments[0].author.name).toBe('Ada Lovelace');
  });

  it('skips ids that point to missing entities instead of returning holes', () => {
    const { entities, result } = normalize(makeFeed());
    delete entities.comments.c1;
    const posts = denormalize([...result, 'p404'], entities);
    expect(posts.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(posts[0].comments.map((c) => c.id)).toEqual(['c2']);
  });
});
