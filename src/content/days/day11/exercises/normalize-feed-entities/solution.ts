// ----- API shape (nested, as the server returns it) -----
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}
export interface Comment {
  id: string;
  body: string;
  author: User;
}
export interface Post {
  id: string;
  title: string;
  author: User;
  comments: Comment[];
}

// ----- Normalized shape (flat tables, references are ids) -----
export interface PostEntity {
  id: string;
  title: string;
  author: string; // user id
  comments: string[]; // comment ids
}
export interface CommentEntity {
  id: string;
  body: string;
  author: string; // user id
}
export interface Entities {
  posts: Record<string, PostEntity>;
  users: Record<string, User>;
  comments: Record<string, CommentEntity>;
}
export interface NormalizedFeed {
  entities: Entities;
  /** Top-level post ids, in the order the API returned them. */
  result: string[];
}

/** Shallow-merge into a table: later fields win, missing fields are kept. Always writes a fresh object. */
function upsert<T extends { id: string }>(table: Record<string, T>, entity: T): string {
  const existing = Object.hasOwn(table, entity.id) ? table[entity.id] : undefined;
  table[entity.id] = { ...existing, ...entity };
  return entity.id;
}

export function normalize(posts: Post[]): NormalizedFeed {
  const entities: Entities = { posts: {}, users: {}, comments: {} };

  const result = posts.map((post) => {
    const { author, comments, ...postFields } = post;
    const authorId = upsert(entities.users, author); // document order: the post's author before its comments
    const commentIds = comments.map((comment) => {
      const { author: commentAuthor, ...commentFields } = comment;
      return upsert(entities.comments, { ...commentFields, author: upsert(entities.users, commentAuthor) });
    });
    return upsert(entities.posts, { ...postFields, author: authorId, comments: commentIds });
  });

  return { entities, result };
}

export function denormalize(result: string[], entities: Entities): Post[] {
  const getUser = (id: string): User | undefined =>
    Object.hasOwn(entities.users, id) ? { ...entities.users[id] } : undefined;

  const getComment = (id: string): Comment | undefined => {
    if (!Object.hasOwn(entities.comments, id)) return undefined;
    const { author: authorId, ...fields } = entities.comments[id];
    const author = getUser(authorId);
    return author ? { ...fields, author } : undefined;
  };

  const posts: Post[] = [];
  for (const id of result) {
    if (!Object.hasOwn(entities.posts, id)) continue;
    const { author: authorId, comments: commentIds, ...fields } = entities.posts[id];
    const author = getUser(authorId);
    if (!author) continue;
    const comments = commentIds.map(getComment).filter((c): c is Comment => c !== undefined);
    posts.push({ ...fields, author, comments });
  }
  return posts;
}
