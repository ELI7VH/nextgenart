type Event = {
  beats: number
  callback: (count: number) => void
  triggered: boolean
  continuous: boolean //
  discard?: boolean // if true, the handler will be discarded after it is triggered
  count: number
  u: number
}

export class BeatMapper {
  private events: Event[] = []
  private currentTime: number = 0

  public bpm: number
  public beatu: number = 0
  public beat: number = 0
  public interval: number = 0
  public count: number = 0

  constructor(bpm: number) {
    this.bpm = bpm
  }

  at(beats: number, callback: (count: number) => void) {
    this.events.push({
      beats,
      callback,
      triggered: false,
      continuous: false,
      count: 0,
      u: 0,
    })
  }

  every(beats: number, callback: (count: number) => void) {
    this.events.push({
      beats,
      callback,
      triggered: false,
      continuous: true,
      count: 0,
      u: 0,
    })
  }

  update(dt: number) {
    this.beatu = this.currentTime / (60 / this.bpm)
    this.interval = this.beatu % 1
    this.beat = Math.floor(this.beatu)
    this.currentTime += dt

    this.events.forEach((event) => {
      if (!event.continuous && event.triggered) return

      const triggered = this.beatu > event.beats * event.count

      if (triggered) {
        if (!event.continuous) event.triggered = true
        event.count += 1

        event.callback(event.count)
        event.u = 0
      }
    })
  }

  reset() {
    this.currentTime = 0
    this.events.forEach((event) => {
      event.triggered = false
    })
  }
}
