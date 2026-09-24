import { useEffect, useRef, useState } from 'react'
import { exportSideBySide } from './export'
import {
  IconClose, IconDownload, IconFilm, IconFlagMark, IconPause, IconPlay,
  IconRestart, IconShare, IconStepBack, IconStepFwd, IconSwap,
} from './icons'

const SPEEDS = [0.25, 0.5, 1] as const
const FRAME = 1 / 30 // コマ送りの単位（一般的な動画のフレームレートの目安）

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setUrl(null); return }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return portrait
}

// iOS Safariは一時停止中にcurrentTimeだけ変えても映像が更新されないことがあるため、
// ごく短く再生してすぐ止めて確実に反映させる
function seekVideo(v: HTMLVideoElement, time: number) {
  v.currentTime = Math.max(0, time)
  if (v.paused) {
    v.play().then(() => v.pause()).catch(() => {})
  }
}

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

function IconBtn({ onClick, disabled, children, title }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="w-8 h-8 grid place-items-center rounded-lg bg-raised/90 border border-line text-fg shrink-0 transition active:scale-90 disabled:opacity-30">
      {children}
    </button>
  )
}

type TileProps = {
  label: string
  file: File | null
  onPick: (f: File) => void
  onClear: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  rate: number
  startAt: number
  onSetStart: (t: number) => void
  title: string
  onTitleChange: (v: string) => void
}

function VideoTile({ label, file, onPick, onClear, videoRef, rate, startAt, onSetStart, title, onTitleChange }: TileProps) {
  const url = useObjectUrl(file)
  const [dur, setDur] = useState(0)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const draggingRef = useRef(false)

  useEffect(() => {
    setStatus('loading')
    setDur(0)
    setT(0)
  }, [url])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = rate
  }, [rate, url, videoRef])

  function step(delta: number) {
    const v = videoRef.current
    if (!v) return
    v.pause()
    seekVideo(v, Math.min(dur, v.currentTime + delta))
  }

  const markPct = dur > 0 ? Math.min(100, (startAt / dur) * 100) : 0

  return (
    <div className="relative flex-1 min-w-0 h-full bg-black rounded-2xl overflow-hidden border border-line">
      <span className="absolute top-2 left-2 z-10 text-xs font-black italic text-ink bg-accent px-2 py-0.5 rounded-md shadow-[0_0_16px_-2px_var(--color-accent)]">{label}</span>

      {url ? (
        <>
          <video ref={videoRef} src={url} playsInline muted preload="metadata" className="w-full h-full object-contain"
            onLoadedMetadata={e => {
              // durationが分かった時点で操作可能にする。2本同時にpreload="auto"でフル読み込みさせると
              // iPhoneの動画デコーダーが競合し、片方が読み込み中のまま固まることがあったため
              setDur(e.currentTarget.duration)
              setStatus('ready')
              const v = e.currentTarget
              // 最初のフレームが真っ黒のままにならないよう試みる（失敗しても致命的ではないので無視する）
              v.play().then(() => v.pause()).catch(() => {})
            }}
            onLoadedData={() => setStatus('ready')}
            onTimeUpdate={e => { if (!draggingRef.current) setT(e.currentTarget.currentTime) }}
            onSeeked={e => { if (!draggingRef.current) setT(e.currentTarget.currentTime) }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onError={() => setStatus('error')} />
          {status === 'loading' && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 text-center">
              <p className="text-sm text-danger font-bold">この動画を読み込めませんでした</p>
              <button onClick={onClear} className="h-9 px-4 rounded-lg bg-raised border border-line text-xs font-bold">外して選び直す</button>
            </div>
          )}
          <button onClick={onClear} title="外す"
            className="absolute top-2 right-2 z-10 w-7 h-7 grid place-items-center rounded-full bg-ink/70 text-muted hover:text-fg transition"><IconClose /></button>
          <input value={title} onChange={e => onTitleChange(e.target.value)} placeholder="タイトル（書き出しに表示）" maxLength={20}
            className="absolute top-2 left-11 right-11 z-10 h-7 px-2 rounded-md bg-ink/70 border border-line text-xs text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none" />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-6 pb-2 px-2 space-y-1.5">
            <div className="relative flex items-center h-3">
              {startAt > 0 && (
                <span className="absolute w-0.5 h-3 bg-accent rounded-full pointer-events-none shadow-[0_0_6px_var(--color-accent)]" style={{ left: `calc(${markPct}% - 1px)` }} />
              )}
              <input type="range" min={0} max={Math.max(dur, 0.01)} step={0.01} value={Math.min(t, dur)}
                onPointerDown={() => { draggingRef.current = true }}
                onChange={e => {
                  // ドラッグ中は動画側のtimeupdate/seekedがtを上書きしてスライダーと引っ張り合うのを防ぐ（draggingRef）。
                  // 再生→停止の対策も毎回はやらない（連打になって映像側と競合するため）、軽いシークだけにする
                  const v = videoRef.current
                  const time = Number(e.target.value)
                  setT(time)
                  if (v) v.currentTime = time
                }}
                onPointerUp={() => {
                  // 指を離した瞬間だけ、iOS Safariの「一時停止中は映像が更新されないことがある」対策を1回だけ行う
                  draggingRef.current = false
                  const v = videoRef.current
                  if (v && v.paused) v.play().then(() => v.pause()).catch(() => {})
                }}
                onPointerCancel={() => { draggingRef.current = false }}
                className="w-full h-1 block" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted tabular-nums w-16 shrink-0">{fmt(t)}/{fmt(dur)}</span>
              <div className="flex-1" />
              <button onClick={() => onSetStart(t)} title="ここを開始位置にする"
                className="h-8 px-2 flex items-center gap-1 rounded-lg bg-raised/90 border border-accent/60 text-accent text-[11px] font-bold shrink-0 transition active:scale-95">
                <IconFlagMark className="text-sm" /><span>開始位置に</span>
              </button>
              <IconBtn onClick={() => step(-FRAME)} title="1コマ戻す"><IconStepBack className="text-sm" /></IconBtn>
              <IconBtn onClick={() => { const v = videoRef.current; if (!v) return; playing ? v.pause() : v.play() }} title={playing ? '一時停止' : '再生'}>
                {playing ? <IconPause className="text-sm" /> : <IconPlay className="text-sm" />}
              </IconBtn>
              <IconBtn onClick={() => step(FRAME)} title="1コマ進める"><IconStepFwd className="text-sm" /></IconBtn>
              <IconBtn onClick={() => { const v = videoRef.current; if (v) seekVideo(v, startAt) }} title="開始位置へ戻る"><IconRestart className="text-sm" /></IconBtn>
            </div>
          </div>
        </>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted cursor-pointer group">
          <span className="w-14 h-14 rounded-2xl border-2 border-dashed border-line grid place-items-center text-2xl text-muted group-hover:border-accent group-hover:text-accent group-active:scale-95 transition">
            <IconFilm />
          </span>
          <span className="text-sm font-bold group-hover:text-accent transition">動画を選ぶ</span>
          <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      )}
    </div>
  )
}

export default function App() {
  const portrait = usePortrait()
  const [hideRotateHint, setHideRotateHint] = useState(false)
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [rate, setRate] = useState<number>(1)
  const [startA, setStartA] = useState(0)
  const [startB, setStartB] = useState(0)
  const [titleA, setTitleA] = useState('')
  const [titleB, setTitleB] = useState('')
  const refA = useRef<HTMLVideoElement>(null)
  const refB = useRef<HTMLVideoElement>(null)

  // 新しい動画を選んだときだけ開始位置マーク・タイトルをリセットする（入れ替えでは保持する）
  function pickA(f: File) { setFileA(f); setStartA(0); setTitleA('') }
  function pickB(f: File) { setFileB(f); setStartB(0); setTitleB('') }

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ p: 0, label: '' })
  const [result, setResult] = useState<File | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const resultUrl = useObjectUrl(result)

  const both = fileA && fileB

  function toggleBoth() {
    if (refA.current && !refA.current.paused) { refA.current.pause(); refB.current?.pause() }
    else { refA.current?.play(); refB.current?.play() }
  }
  function resetBoth() {
    if (refA.current) seekVideo(refA.current, startA)
    if (refB.current) seekVideo(refB.current, startB)
  }
  function swap() {
    setFileA(fileB)
    setFileB(fileA)
    setStartA(startB)
    setStartB(startA)
    setTitleA(titleB)
    setTitleB(titleA)
  }

  async function runExport() {
    if (!fileA || !fileB) return
    setBusy(true)
    setError('')
    setResult(null)
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const f = await exportSideBySide(fileA, fileB, startA, startB, titleA, titleB, (p, label) => setProgress({ p, label }), ac.signal)
      setResult(f)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!result) return
    if (navigator.canShare?.({ files: [result] })) {
      try { await navigator.share({ files: [result] }) } catch { /* キャンセルは無視 */ }
    } else {
      const a = document.createElement('a')
      a.href = resultUrl!
      a.download = result.name
      a.click()
    }
  }

  const chip = 'h-9 px-3 flex items-center gap-1.5 rounded-xl text-xs font-bold border border-line bg-raised whitespace-nowrap transition active:scale-95 disabled:opacity-30 disabled:active:scale-100'

  return (
    <div className="overflow-hidden flex flex-col bg-ink text-fg p-2 gap-2" style={{ position: 'fixed', inset: 0 }}>
      {portrait && !hideRotateHint && (
        <div className="shrink-0 flex items-center gap-2 h-8 px-3 rounded-lg bg-accent/15 border border-accent/40 text-[11px] text-accent font-bold">
          <span className="flex-1">横向きにすると操作しやすくなります</span>
          <button onClick={() => setHideRotateHint(true)} className="shrink-0"><IconClose className="text-sm" /></button>
        </div>
      )}
      <header className="shrink-0 flex items-center gap-1.5">
        <img src="icon-512.png" width={28} height={28} className="rounded-lg shrink-0" alt="FORM CHECK" />

        {/* 主役の「書き出す」だけは常時フル表示。それ以外は入り切らないときだけこの中でスクロールする */}
        <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-raised border border-line shrink-0">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setRate(s)}
                className={`h-8 px-2 rounded-lg text-[11px] font-bold transition ${rate === s ? 'bg-accent text-ink' : 'text-muted'}`}>
                ×{s}
              </button>
            ))}
          </div>

          <IconBtn onClick={resetBoth} disabled={!both} title="開始位置へ"><IconRestart className="text-sm" /></IconBtn>
          <IconBtn onClick={toggleBoth} disabled={!both} title="同時再生・停止"><IconPlay className="text-sm" /></IconBtn>
          <IconBtn onClick={swap} disabled={!both} title="AとBを入れ替え"><IconSwap className="text-sm" /></IconBtn>
        </div>

        <button className="h-9 px-3 flex items-center gap-1.5 rounded-xl text-xs font-black bg-accent text-ink whitespace-nowrap shrink-0 transition active:scale-95 disabled:opacity-30"
          onClick={runExport} disabled={!both || busy}>
          <IconDownload className="text-sm" />{busy ? `${Math.round(progress.p * 100)}%` : '書き出す'}
        </button>
      </header>

      <main className="flex-1 min-h-0 flex gap-2">
        <VideoTile label="A" file={fileA} onPick={pickA} onClear={() => setFileA(null)} videoRef={refA} rate={rate} startAt={startA} onSetStart={setStartA} title={titleA} onTitleChange={setTitleA} />
        <VideoTile label="B" file={fileB} onPick={pickB} onClear={() => setFileB(null)} videoRef={refB} rate={rate} startAt={startB} onSetStart={setStartB} title={titleB} onTitleChange={setTitleB} />
      </main>

      {(busy || result || error) && (
        <div className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl p-4 w-full max-w-sm space-y-3">
            {busy && (
              <>
                <p className="text-sm text-muted">{progress.label || '書き出し中…'}</p>
                <div className="h-2 bg-raised rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress.p * 100}%` }} />
                </div>
                <button className={`${chip} w-full justify-center`} onClick={() => abortRef.current?.abort()}>中止</button>
              </>
            )}
            {!busy && error && (
              <>
                <p className="text-sm text-danger">{error}</p>
                <button className={`${chip} w-full justify-center`} onClick={() => setError('')}>閉じる</button>
              </>
            )}
            {!busy && result && resultUrl && (
              <>
                <video src={resultUrl} controls playsInline className="w-full rounded-xl bg-black" />
                <p className="text-xs text-muted">{(result.size / 1e6).toFixed(1)}MB</p>
                <button className="h-11 w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-ink text-sm font-black transition active:scale-95" onClick={save}>
                  <IconShare className="text-base" />保存・共有する
                </button>
                <button className={`${chip} w-full justify-center`} onClick={() => setResult(null)}>閉じる</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
