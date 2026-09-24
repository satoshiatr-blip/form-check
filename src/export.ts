// AとBを左右に並べた1本の動画として書き出す。音声は付けない（2本分あると煩雑なため）
import {
  ALL_FORMATS, BlobSource, BufferTarget, CanvasSink, CanvasSource,
  Input, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeVideo,
} from 'mediabunny'

export const OUT_W = 1920
export const OUT_H = 1080
const FPS = 30
const HALF_W = OUT_W / 2

function roundRect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 各動画の左上にタイトルを重ねる（元動画の縦横比で上下に黒帯ができない場合もあるため、常にバッジとして重ねる）
function drawTitle(ctx: OffscreenCanvasRenderingContext2D, text: string, xOffset: number) {
  if (!text) return
  ctx.save()
  ctx.font = '900 34px -apple-system, "Hiragino Sans", sans-serif'
  const padX = 18
  const w = Math.min(HALF_W - 40, ctx.measureText(text).width + padX * 2)
  const h = 52
  const x = xOffset + 20
  const y = 20
  ctx.fillStyle = 'rgba(4,6,12,0.75)'
  roundRect(ctx, x, y, w, h, 10)
  ctx.fill()
  ctx.fillStyle = '#baff2e'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + padX, y + h / 2 + 1, w - padX * 2)
  ctx.restore()
}

export async function exportSideBySide(
  fileA: File,
  fileB: File,
  startA: number,
  startB: number,
  titleA: string,
  titleB: string,
  onProgress: (p: number, label: string) => void,
  signal: AbortSignal,
): Promise<File> {
  if (!(await canEncodeVideo('avc', { width: OUT_W, height: OUT_H })))
    throw new Error('この端末のブラウザは動画の書き出しに対応していません')

  const inputA = new Input({ source: new BlobSource(fileA), formats: ALL_FORMATS })
  const inputB = new Input({ source: new BlobSource(fileB), formats: ALL_FORMATS })
  try {
    const [vA, vB] = await Promise.all([inputA.getPrimaryVideoTrack(), inputB.getPrimaryVideoTrack()])
    if (!vA || !vB) throw new Error('映像トラックを読み取れませんでした')
    const [durA, durB] = await Promise.all([inputA.computeDuration(), inputB.computeDuration()])
    // 開始位置より後ろだけを対象にする（指定した瞬間から2本を合わせる）
    const remA = Math.max(0, durA - Math.min(startA, durA))
    const remB = Math.max(0, durB - Math.min(startB, durB))
    const total = Math.max(remA, remB)
    const totalFrames = Math.max(1, Math.round(total * FPS))

    const canvas = new OffscreenCanvas(OUT_W, OUT_H)
    const ctx = canvas.getContext('2d')!
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
    const video = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH })
    output.addVideoTrack(video, { frameRate: FPS })
    await output.start()

    const sinkA = new CanvasSink(vA, { width: HALF_W, height: OUT_H, fit: 'contain', poolSize: 2 })
    const sinkB = new CanvasSink(vB, { width: HALF_W, height: OUT_H, fit: 'contain', poolSize: 2 })
    const timesA = Array.from({ length: totalFrames }, (_, i) => startA + i / FPS)
    const timesB = Array.from({ length: totalFrames }, (_, i) => startB + i / FPS)

    const iterA = sinkA.canvasesAtTimestamps(timesA)[Symbol.asyncIterator]()
    const iterB = sinkB.canvasesAtTimestamps(timesB)[Symbol.asyncIterator]()
    let lastA: CanvasImageSource | null = null
    let lastB: CanvasImageSource | null = null

    ctx.fillStyle = '#000'
    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) throw new DOMException('中止しました', 'AbortError')
      const [ra, rb] = await Promise.all([iterA.next(), iterB.next()])
      if (!ra.done && ra.value) lastA = ra.value.canvas
      if (!rb.done && rb.value) lastB = rb.value.canvas
      ctx.fillRect(0, 0, OUT_W, OUT_H)
      if (lastA) ctx.drawImage(lastA, 0, 0, HALF_W, OUT_H)
      if (lastB) ctx.drawImage(lastB, HALF_W, 0, HALF_W, OUT_H)
      ctx.fillRect(HALF_W - 2, 0, 4, OUT_H)
      drawTitle(ctx, titleA, 0)
      drawTitle(ctx, titleB, HALF_W)
      await video.add(i / FPS, 1 / FPS)
      if (i % 10 === 0) onProgress(i / totalFrames, `書き出し中 ${Math.round((i / totalFrames) * 100)}%`)
    }

    onProgress(1, '仕上げ中')
    await output.finalize()
    const buf = (output.target as BufferTarget).buffer!
    return new File([buf], `form-check_${Date.now()}.mp4`, { type: 'video/mp4' })
  } finally {
    inputA.dispose()
    inputB.dispose()
  }
}
