/**
 * 発表ムービー用の効果音/BGMをブラウザ内で合成する（Web Audio API）。
 * 著作権フリー・完全無料。シーンに合わせて高揚感を出す。
 */
type Chord = number[]

const A_MAJOR: Chord = [220.0, 277.18, 329.63] // A C# E
const BRIGHT: Chord = [261.63, 329.63, 392.0, 523.25] // C E G C（明るく豪華）
const TENSION: Chord = [196.0, 233.08, 277.18] // G Bb C#（緊張）

export class FilmAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private padGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private padOscs: OscillatorNode[] = []
  private cheerGain: GainNode | null = null
  private beatTimer: number | null = null
  private arpTimer: number | null = null
  private noiseBuf: AudioBuffer | null = null
  muted = false

  async start() {
    try {
      if (this.ctx) {
        await this.ctx.resume()
        return
      }
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(ctx.destination)

      // パッド（持続コード）
      this.filter = ctx.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 700
      this.padGain = ctx.createGain()
      this.padGain.gain.value = 0.16
      this.filter.connect(this.padGain)
      this.padGain.connect(this.master)
      this.setChord(A_MAJOR)

      // 歓声（ホワイトノイズをバンドパス）
      this.noiseBuf = this.makeNoise(2)
      this.cheerGain = ctx.createGain()
      this.cheerGain.gain.value = 0
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1500
      bp.Q.value = 0.7
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuf
      src.loop = true
      src.connect(bp)
      bp.connect(this.cheerGain)
      this.cheerGain.connect(this.master)
      src.start()

      this.startBeat()
      await ctx.resume()
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, ctx.currentTime + 1.2)
    } catch {
      /* 音が出せない環境では無音で続行 */
    }
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  private setChord(freqs: Chord) {
    if (!this.ctx || !this.filter) return
    this.padOscs.forEach((o) => {
      try {
        o.stop()
      } catch {
        /* noop */
      }
    })
    this.padOscs = freqs.map((f) => {
      const o = this.ctx!.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const g = this.ctx!.createGain()
      g.gain.value = 0.3 / freqs.length + 0.08
      o.connect(g)
      g.connect(this.filter!)
      o.start()
      return o
    })
  }

  private startBeat() {
    if (this.beatTimer) return
    this.beatTimer = window.setInterval(() => this.kick(), 500) // 120BPM
  }

  private kick(vol = 0.7) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.16)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    o.connect(g)
    g.connect(this.master)
    o.start()
    o.stop(ctx.currentTime + 0.22)
  }

  /** シーン強度（0=静か … 2=最高潮） */
  intensity(level: 0 | 1 | 2) {
    if (!this.ctx || !this.filter || !this.padGain) return
    const t = this.ctx.currentTime
    const f = level === 0 ? 600 : level === 1 ? 1300 : 2800
    const g = level === 0 ? 0.12 : level === 1 ? 0.18 : 0.22
    this.filter.frequency.linearRampToValueAtTime(f, t + 0.8)
    this.padGain.gain.linearRampToValueAtTime(g, t + 0.8)
  }

  cheer(on: boolean) {
    if (!this.ctx || !this.cheerGain) return
    this.cheerGain.gain.linearRampToValueAtTime(on ? 0.14 : 0, this.ctx.currentTime + 0.6)
  }

  chord(name: 'base' | 'bright' | 'tension') {
    this.setChord(name === 'bright' ? BRIGHT : name === 'tension' ? TENSION : A_MAJOR)
  }

  /** キラキラ（ほわほわ） */
  sparkle() {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    for (let i = 0; i < 8; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 1400 + Math.random() * 1600
      const at = ctx.currentTime + i * 0.08
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.18, at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.25)
      o.connect(g)
      g.connect(this.master)
      o.start(at)
      o.stop(at + 0.3)
    }
  }

  /** だーん（インパクト） */
  impact() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuf) return
    // 低音ヒット
    this.kick(1.0)
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(110, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.5)
    g.gain.setValueAtTime(0.9, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    o.connect(g)
    g.connect(this.master)
    o.start()
    o.stop(ctx.currentTime + 0.75)
    // シンバル（ノイズ）
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuf
    const ng = ctx.createGain()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 5000
    ng.gain.setValueAtTime(0.5, ctx.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    n.connect(hp)
    hp.connect(ng)
    ng.connect(this.master)
    n.start()
    n.stop(ctx.currentTime + 0.9)
  }

  /** 勝利のアルペジオ（最終シーン） */
  triumph() {
    this.chord('bright')
    this.intensity(2)
    if (this.arpTimer || !this.ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    let i = 0
    this.arpTimer = window.setInterval(() => {
      const ctx = this.ctx
      if (!ctx || !this.master) return
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = notes[i % notes.length]
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      o.connect(g)
      g.connect(this.master)
      o.start()
      o.stop(ctx.currentTime + 0.42)
      i++
    }, 220)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx && this.master) {
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.9, this.ctx.currentTime + 0.2)
    }
  }

  stop() {
    if (this.beatTimer) window.clearInterval(this.beatTimer)
    if (this.arpTimer) window.clearInterval(this.arpTimer)
    this.beatTimer = null
    this.arpTimer = null
    try {
      this.ctx?.close()
    } catch {
      /* noop */
    }
    this.ctx = null
  }
}
