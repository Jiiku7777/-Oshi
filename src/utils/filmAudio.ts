/**
 * 発表ムービー用の効果音/BGMをブラウザ内で合成する（Web Audio API）。
 * 著作権フリー・完全無料。ソシャゲのガチャのように「期待→ご褒美」でワクワクさせる。
 */
type Chord = number[]

const A_MAJOR: Chord = [220.0, 277.18, 329.63]
const BRIGHT: Chord = [261.63, 329.63, 392.0, 523.25]
const TENSION: Chord = [233.08, 277.18, 349.23] // やや不穏（期待感）

export class FilmAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private padGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private padOscs: OscillatorNode[] = []
  private cheerGain: GainNode | null = null
  private beatGain: GainNode | null = null
  private beatTimer: number | null = null
  private arpTimer: number | null = null
  private snsTimer: number | null = null
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

      // やわらかいパッド（三角波・軽いデチューンで煌びやか）
      this.filter = ctx.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 900
      this.padGain = ctx.createGain()
      this.padGain.gain.value = 0.12
      this.filter.connect(this.padGain)
      this.padGain.connect(this.master)
      this.setChord(A_MAJOR)

      // 歓声
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

      // ビート（既定は無音。盛り上がるシーンだけ上げる）
      this.beatGain = ctx.createGain()
      this.beatGain.gain.value = 0
      this.beatGain.connect(this.master)
      this.startBeat()

      await ctx.resume()
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, ctx.currentTime + 1.2)
    } catch {
      /* 無音で続行 */
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
    const detunes = [-6, 0, 6]
    this.padOscs = freqs.map((f, idx) => {
      const o = this.ctx!.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      o.detune.value = detunes[idx % detunes.length]
      const g = this.ctx!.createGain()
      g.gain.value = 0.26 / freqs.length + 0.06
      o.connect(g)
      g.connect(this.filter!)
      o.start()
      return o
    })
  }

  private startBeat() {
    if (this.beatTimer) return
    this.beatTimer = window.setInterval(() => this.kick(), 500)
  }

  private kick(vol = 0.7, toMaster = false) {
    const ctx = this.ctx
    const dest = toMaster ? this.master : this.beatGain
    if (!ctx || !dest || !this.master) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.16)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    o.connect(g)
    g.connect(dest)
    o.start()
    o.stop(ctx.currentTime + 0.22)
  }

  /** ビート音量（0=静か） */
  beat(level: number) {
    if (!this.ctx || !this.beatGain) return
    this.beatGain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + 0.4)
  }

  intensity(level: 0 | 1 | 2) {
    if (!this.ctx || !this.filter || !this.padGain) return
    const t = this.ctx.currentTime
    const f = level === 0 ? 700 : level === 1 ? 1500 : 3000
    const g = level === 0 ? 0.1 : level === 1 ? 0.15 : 0.2
    this.filter.frequency.linearRampToValueAtTime(f, t + 0.8)
    this.padGain.gain.linearRampToValueAtTime(g, t + 0.8)
  }

  cheer(on: boolean) {
    if (!this.ctx || !this.cheerGain) return
    this.cheerGain.gain.linearRampToValueAtTime(on ? 0.13 : 0, this.ctx.currentTime + 0.6)
  }

  chord(name: 'base' | 'bright' | 'tension') {
    this.setChord(name === 'bright' ? BRIGHT : name === 'tension' ? TENSION : A_MAJOR)
  }

  /** ベル単音（ガチャの煌めき） */
  private bell(freq: number, at: number, vol = 0.2, dur = 0.5) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const o = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o2.type = 'sine'
    o.frequency.value = freq
    o2.frequency.value = freq * 2.01 // 倍音でキラッと
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.001, at + dur)
    o.connect(g)
    o2.connect(g)
    g.connect(this.master)
    o.start(at)
    o2.start(at)
    o.stop(at + dur + 0.05)
    o2.stop(at + dur + 0.05)
  }

  /** キラキラ（ランダムなベル） */
  sparkle() {
    const ctx = this.ctx
    if (!ctx) return
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
    for (let i = 0; i < 8; i++) {
      this.bell(scale[Math.floor(Math.random() * scale.length)] * 2, ctx.currentTime + i * 0.07, 0.12, 0.35)
    }
  }

  /** ガチャの「期待」ライザー（上昇するスイープ） */
  riser(duration = 3) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuf) return
    const t = ctx.currentTime
    // ノイズスイープ
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuf
    n.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(400, t)
    bp.frequency.exponentialRampToValueAtTime(6000, t + duration)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.001, t)
    ng.gain.exponentialRampToValueAtTime(0.18, t + duration)
    ng.gain.linearRampToValueAtTime(0.0001, t + duration + 0.15)
    n.connect(bp)
    bp.connect(ng)
    ng.connect(this.master)
    n.start(t)
    n.stop(t + duration + 0.2)
    // 上昇する純音
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(220, t)
    o.frequency.exponentialRampToValueAtTime(1760, t + duration)
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(0.06, t + duration)
    og.gain.linearRampToValueAtTime(0.0001, t + duration + 0.12)
    o.connect(og)
    og.connect(this.master)
    o.start(t)
    o.stop(t + duration + 0.2)
    // チクタク（期待のクリック）
    for (let i = 0; i < Math.floor(duration / 0.18); i++) {
      this.bell(1200, t + i * 0.18, 0.05, 0.08)
    }
  }

  /** ご褒美の上昇チャイム（ガチャ確定のキラーン） */
  chimeUp() {
    const ctx = this.ctx
    if (!ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5] // C E G C E（明るい）
    notes.forEach((f, i) => this.bell(f, ctx.currentTime + i * 0.09, 0.26, 0.7))
    // 余韻のキラキラ
    for (let i = 0; i < 6; i++) this.bell(1568 + i * 100, ctx.currentTime + 0.5 + i * 0.06, 0.1, 0.5)
  }

  /** SNS（エゴサ）シーンのかわいいループBGM */
  snsLoop(on: boolean) {
    if (on) {
      if (this.snsTimer || !this.ctx) return
      const mel = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25]
      let i = 0
      this.snsTimer = window.setInterval(() => {
        if (!this.ctx) return
        this.bell(mel[i % mel.length], this.ctx.currentTime, 0.1, 0.42)
        if (i % 4 === 0) this.bell(mel[i % mel.length] * 2, this.ctx.currentTime + 0.12, 0.05, 0.3)
        i++
      }, 300)
    } else if (this.snsTimer) {
      window.clearInterval(this.snsTimer)
      this.snsTimer = null
    }
  }

  /** いいねの効果音（ぽよん♪＋きゅん） */
  likePop() {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(620, t)
    o.frequency.exponentialRampToValueAtTime(990, t + 0.12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.22, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + 0.27)
    this.bell(1760, t + 0.06, 0.14, 0.4)
  }

  /** だーん（インパクト） */
  impact() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuf) return
    this.kick(1.0, true)
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
    const nz = ctx.createBufferSource()
    nz.buffer = this.noiseBuf
    const ng = ctx.createGain()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 5000
    ng.gain.setValueAtTime(0.5, ctx.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    nz.connect(hp)
    hp.connect(ng)
    ng.connect(this.master)
    nz.start()
    nz.stop(ctx.currentTime + 0.9)
  }

  /** 勝利のベルアルペジオ（最終シーン） */
  triumph() {
    this.chord('bright')
    this.intensity(2)
    if (this.arpTimer || !this.ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25]
    let i = 0
    this.arpTimer = window.setInterval(() => {
      if (!this.ctx) return
      this.bell(notes[i % notes.length], this.ctx.currentTime, 0.16, 0.45)
      i++
    }, 230)
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
    if (this.snsTimer) window.clearInterval(this.snsTimer)
    this.beatTimer = null
    this.arpTimer = null
    this.snsTimer = null
    try {
      this.ctx?.close()
    } catch {
      /* noop */
    }
    this.ctx = null
  }
}
