const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const { attachUser, requireAuth } = require('./auth');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(attachUser);

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
const canModify = (user, item) => user.isAdmin || item.authorId === user.sub;

function validatePost(body = {}) {
  const title = String(body.title ?? '').trim();
  const text = String(body.body ?? '').trim();
  const tag = String(body.tag ?? '').trim().slice(0, 24);
  if (title.length < 3 || title.length > 120) return { error: 'Title must be 3-120 characters.' };
  if (text.length < 20 || text.length > 20000) return { error: 'The story must be 20-20,000 characters.' };
  const flat = text.replace(/\s+/g, ' ');
  return {
    value: {
      title,
      tag,
      body: text,
      excerpt: flat.length > 180 ? `${flat.slice(0, 177)}...` : flat,
      readMins: Math.max(1, Math.round(text.split(/\s+/).length / 200)),
    },
  };
}

// ---- public ----
app.get('/api/posts', async (_req, res) => res.json({ posts: await db.listPosts() }));

app.get('/api/posts/:id', async (req, res) => {
  const found = await db.getPost(req.params.id);
  if (!found) return res.status(404).json({ error: 'Story not found.' });
  res.json(found);
});

// ---- signed-in ----
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.post('/api/posts', requireAuth, async (req, res) => {
  const { value, error } = validatePost(req.body);
  if (error) return res.status(400).json({ error });
  // authorId and authorName always come from the verified token, never from the request body.
  const post = await db.createPost({
    id: newId(),
    ...value,
    authorId: req.user.sub,
    authorName: req.user.name,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ post });
});

app.put('/api/posts/:id', requireAuth, async (req, res) => {
  const found = await db.getPost(req.params.id);
  if (!found) return res.status(404).json({ error: 'Story not found.' });
  if (!canModify(req.user, found.post)) return res.status(403).json({ error: 'You can only edit your own stories.' });
  const { value, error } = validatePost(req.body);
  if (error) return res.status(400).json({ error });
  const post = await db.updatePost(req.params.id, { ...value, updatedAt: new Date().toISOString() });
  res.json({ post });
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  const found = await db.getPost(req.params.id);
  if (!found) return res.status(404).json({ error: 'Story not found.' });
  if (!canModify(req.user, found.post)) return res.status(403).json({ error: 'You can only delete your own stories.' });
  await db.deletePost(req.params.id);
  res.status(204).end();
});

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const found = await db.getPost(req.params.id);
  if (!found) return res.status(404).json({ error: 'Story not found.' });
  const text = String(req.body?.text ?? '').trim();
  if (text.length < 1 || text.length > 1000) return res.status(400).json({ error: 'Comments must be 1-1,000 characters.' });
  const comment = await db.addComment(req.params.id, {
    id: `${String(Date.now()).padStart(13, '0')}_${newId().slice(0, 6)}`,
    postId: req.params.id,
    text,
    authorId: req.user.sub,
    authorName: req.user.name,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ comment });
});

// Moderation: a comment's author or anyone in the Cognito "admins" group can delete it.
app.delete('/api/posts/:id/comments/:commentId', requireAuth, async (req, res) => {
  const comment = await db.getComment(req.params.id, req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (!canModify(req.user, comment)) return res.status(403).json({ error: 'You can only delete your own comments.' });
  await db.deleteComment(req.params.id, req.params.commentId);
  res.status(204).end();
});

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

module.exports = app;
