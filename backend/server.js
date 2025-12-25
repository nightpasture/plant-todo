const express = require('express')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const app = express()

app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
})

const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)

// 恢复出厂设置
app.post('/api/sync/factory-reset', (req, res) => {
  const files = fs.readdirSync(DATA_DIR)
  for (const f of files) {
    fs.unlinkSync(path.join(DATA_DIR, f))
  }
  res.json({ ok: '删除成功', deleted: files.length })
})

app.get('/api/sync/:id', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.json`)
  if (!fs.existsSync(file)) return res.json({})
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')))
})

app.post('/api/sync/:id', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.json`)
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2))
  res.json({ ok: true })
})

app.get('/api/sync/recodes/:id', (req, res) => {
  const file = path.join(DATA_DIR, `recodes-${req.params.id}.json`)
  if (!fs.existsSync(file)) return res.json([])
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')))
})

app.post('/api/sync/recodes/:id', (req, res) => {
  const file = path.join(DATA_DIR, `recodes-${req.params.id}.json`)

  let history = []
  if (fs.existsSync(file)) {
    history = JSON.parse(fs.readFileSync(file, 'utf8'))
  }

  // 支持单个 todo 或数组
  const todos = Array.isArray(req.body)
    ? req.body
    : [req.body]

  history.push(...todos)

  fs.writeFileSync(file, JSON.stringify(history, null, 2))
  res.json({ ok: true, added: todos.length })
})

// 上传图片（multipart，覆盖）
app.post('/api/sync/image/:id', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file required' })
  }

  const file = path.join(DATA_DIR, `image-${req.params.id}`)
  fs.writeFileSync(file, req.file.buffer)

  res.json({ ok: true })
})

// 获取图片
app.get('/api/sync/image/:id', (req, res) => {
  const file = path.join(DATA_DIR, `image-${req.params.id}`)
  if (!fs.existsSync(file)) {
    return res.sendStatus(404)
  }

  res.setHeader('Cache-Control', 'public, max-age=31536000')
  res.setHeader('Content-Type', 'image/*')
  fs.createReadStream(file).pipe(res)
})

app.listen(3000, () => {
  console.log('API running on 3000')
})
