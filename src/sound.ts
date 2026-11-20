// Little chiptune blips made on the spot with Web Audio: no sound files to ship.

export type Cue = 'start' | 'catch' | 'golden' | 'escape' | 'over' | 'pounce' | 'flip' | 'win'

type Note = { hz: number; ms: number; wave: OscillatorType }

const CUES: Record<Cue, readonly Note[]> = {
  start: [
    { hz: 523, ms: 70, wave: 'square' },
    { hz: 784, ms: 90, wave: 'square' }
  ],
  catch: [
    { hz: 880, ms: 50, wave: 'square' },
    { hz: 1175, ms: 70, wave: 'square' }
  ],
  golden: [
    { hz: 988, ms: 50, wave: 'square' },
    { hz: 1319, ms: 50, wave: 'square' },
    { hz: 1568, ms: 90, wave: 'square' }
  ],
  escape: [{ hz: 196, ms: 160, wave: 'triangle' }],
  over: [
    { hz: 392, ms: 120, wave: 'triangle' },
    { hz: 294, ms: 120, wave: 'triangle' },
    { hz: 196, ms: 260, wave: 'triangle' }
  ],
  pounce: [{ hz: 330, ms: 40, wave: 'triangle' }],
  flip: [{ hz: 620, ms: 30, wave: 'triangle' }],
  win: [
    { hz: 523, ms: 80, wave: 'square' },
    { hz: 659, ms: 80, wave: 'square' },
    { hz: 784, ms: 80, wave: 'square' },
    { hz: 1047, ms: 180, wave: 'square' }
  ]
}

const VOLUME = 0.05

export class Sound {
  enabled = true
  private context: AudioContext | null = null

  play(cue: Cue): void {
    if (!this.enabled) return
    try {
      this.context ??= new AudioContext()
      let at = this.context.currentTime
      for (const note of CUES[cue]) {
        this.note(this.context, note, at)
        at += note.ms / 1000
      }
    } catch (error) {
      console.warn('Gatitos could not play a sound', error)
    }
  }

  private note(context: AudioContext, note: Note, at: number): void {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = note.wave
    oscillator.frequency.value = note.hz
    gain.gain.setValueAtTime(VOLUME, at)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + note.ms / 1000)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(at)
    oscillator.stop(at + note.ms / 1000)
  }
}
