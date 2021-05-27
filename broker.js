const BodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const LRU = require('lru-cache');
const Koa = require('koa');

const app = new Koa();
const router = new Router();

const cache = new LRU({
  max: 65536
});

router.post('/', async ctx => {
  const { automation, run, status, repository } = ctx.request.body

  if (! automation || ! run || ! status) {
    ctx.throw(400);
  }

  cache.set(automation, {run, repository, status});

  ctx.body = { automation, run, repository, status };
});

router.get('/:automation', async ctx => {
  const { automation } = ctx.params;

  const cached = cache.get(automation);

  if (! cached) {
    ctx.throw(404);
  }

  if (cached.status !== 'started') {
    cache.del(automation);
  }

  ctx.body = cached;
});

app
  .use(BodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000, '0.0.0.0', () => {
  console.log('App listening on 0.0.0.0:3000');
});
