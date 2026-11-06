// Seeds two sample stories into the local in-memory store on first run.
async function seed(db) {
  if ((await db.listPosts(1)).length) return;
  const now = Date.now();
  const samples = [
    {
      id: 'welcome001',
      title: 'Why this blog runs on a table with no schema',
      tag: 'Architecture',
      body: `Every post, every comment and every reader reaction lives in one DynamoDB table. That sounds reckless until you see how the keys are chosen.\n\nA post is stored under POST#id with the sort key META. Each comment shares the same partition key and uses COMMENT#timestamp as its sort key. One Query call returns the story and its whole conversation, already in order.\n\nThe feed is a second view of the same data: a global secondary index that groups every post under one key and sorts by creation time. Newest first costs nothing extra.`,
      authorId: 'dev-ada', authorName: 'Ada', createdAt: new Date(now - 36e5 * 30).toISOString(),
    },
    {
      id: 'welcome002',
      title: 'Authentication is not authorization',
      tag: 'Security',
      body: `Signing in proves who you are. It says nothing about what you may do.\n\nIn this app, API Gateway checks the token before Lambda runs, so a forged or expired token never reaches your code. Lambda then reads the verified claims to decide the second question: is this person the author of this story, or a moderator in the admins group?\n\nThe author of a post is always taken from the token. A userId sent in the request body is never trusted.`,
      authorId: 'dev-lin', authorName: 'Lin', createdAt: new Date(now - 36e5 * 6).toISOString(),
    },
  ];
  for (const p of samples) {
    await db.createPost({
      ...p,
      excerpt: p.body.replace(/\s+/g, ' ').slice(0, 177) + '...',
      readMins: Math.max(1, Math.round(p.body.split(/\s+/).length / 200)),
    });
  }
  await db.addComment('welcome002', {
    id: `${String(now).padStart(13, '0')}_seed01`, postId: 'welcome002',
    text: 'This is the distinction the exam keeps testing in different words.',
    authorId: 'dev-ada', authorName: 'Ada', createdAt: new Date(now).toISOString(),
  });
}
module.exports = { seed };
