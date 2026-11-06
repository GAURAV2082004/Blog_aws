/**
 * Single-table design (one query loads a post with its comments):
 *   Post     PK = POST#<id>   SK = META
 *   Comment  PK = POST#<id>   SK = COMMENT#<commentId>   (commentId starts with a timestamp)
 *   GSI1     GSI1PK = POSTS   GSI1SK = createdAt         (newest-first feed)
 * With TABLE_NAME set we use DynamoDB; otherwise an in-memory store for zero-setup local runs.
 */
const fs = require('fs');
const path = require('path');

const pk = (id) => `POST#${id}`;

function createDynamoStore() {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const {
    DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand, GetCommand,
  } = require('@aws-sdk/lib-dynamodb');

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      ...(process.env.DYNAMODB_ENDPOINT && {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }),
    }),
    { marshallOptions: { removeUndefinedValues: true } }
  );
  const TableName = process.env.TABLE_NAME;
  const strip = ({ PK, SK, GSI1PK, GSI1SK, ...rest }) => rest;

  return {
    async createPost(post) {
      await client.send(new PutCommand({
        TableName,
        Item: { PK: pk(post.id), SK: 'META', GSI1PK: 'POSTS', GSI1SK: post.createdAt, ...post },
        ConditionExpression: 'attribute_not_exists(PK)',
      }));
      return post;
    },
    async listPosts(limit = 50) {
      const out = await client.send(new QueryCommand({
        TableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :p',
        ExpressionAttributeValues: { ':p': 'POSTS' },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return (out.Items || []).map(strip).map(({ body, ...summary }) => summary);
    },
    async getPost(id) {
      const out = await client.send(new QueryCommand({
        TableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk(id) },
      }));
      const items = out.Items || [];
      const meta = items.find((i) => i.SK === 'META');
      if (!meta) return null;
      const comments = items.filter((i) => i.SK.startsWith('COMMENT#')).map(strip);
      return { post: strip(meta), comments };
    },
    async updatePost(id, fields) {
      const out = await client.send(new UpdateCommand({
        TableName,
        Key: { PK: pk(id), SK: 'META' },
        UpdateExpression: 'SET #t = :t, tag = :tag, excerpt = :e, body = :b, readMins = :r, updatedAt = :u',
        ExpressionAttributeNames: { '#t': 'title' },
        ExpressionAttributeValues: {
          ':t': fields.title, ':tag': fields.tag, ':e': fields.excerpt, ':b': fields.body,
          ':r': fields.readMins, ':u': fields.updatedAt,
        },
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      }));
      return strip(out.Attributes);
    },
    async deletePost(id) {
      const out = await client.send(new QueryCommand({
        TableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk(id) },
        ProjectionExpression: 'PK, SK',
      }));
      const keys = out.Items || [];
      for (let i = 0; i < keys.length; i += 25) {
        await client.send(new BatchWriteCommand({
          RequestItems: {
            [TableName]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })),
          },
        }));
      }
    },
    async addComment(postId, comment) {
      await client.send(new PutCommand({
        TableName,
        Item: { PK: pk(postId), SK: `COMMENT#${comment.id}`, ...comment },
      }));
      return comment;
    },
    async getComment(postId, commentId) {
      const out = await client.send(new GetCommand({ TableName, Key: { PK: pk(postId), SK: `COMMENT#${commentId}` } }));
      return out.Item ? strip(out.Item) : null;
    },
    async deleteComment(postId, commentId) {
      await client.send(new DeleteCommand({ TableName, Key: { PK: pk(postId), SK: `COMMENT#${commentId}` } }));
    },
  };
}

function createMemoryStore() {
  const file = path.join(__dirname, '.local-data.json');
  let data = { posts: {}, comments: {} }; // comments: { [postId]: { [commentId]: comment } }
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  const save = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));

  return {
    async createPost(post) { data.posts[post.id] = post; data.comments[post.id] = {}; save(); return post; },
    async listPosts(limit = 50) {
      return Object.values(data.posts)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(({ body, ...summary }) => summary);
    },
    async getPost(id) {
      const post = data.posts[id];
      if (!post) return null;
      const comments = Object.values(data.comments[id] || {}).sort((a, b) => a.id.localeCompare(b.id));
      return { post, comments };
    },
    async updatePost(id, fields) { data.posts[id] = { ...data.posts[id], ...fields }; save(); return data.posts[id]; },
    async deletePost(id) { delete data.posts[id]; delete data.comments[id]; save(); },
    async addComment(postId, comment) { (data.comments[postId] ||= {})[comment.id] = comment; save(); return comment; },
    async getComment(postId, commentId) { return data.comments[postId]?.[commentId] || null; },
    async deleteComment(postId, commentId) { delete data.comments[postId]?.[commentId]; save(); },
  };
}

module.exports = process.env.TABLE_NAME ? createDynamoStore() : createMemoryStore();
