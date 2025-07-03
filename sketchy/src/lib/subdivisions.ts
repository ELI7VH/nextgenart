type SubdivisionsProps = {
  bpm?: number
  ms: number
}

export const subdivisions = ({ ms, bpm = 120 }: SubdivisionsProps) => {
  const beats = (ms * 60 * 1000) / bpm
  return Math.floor(beats)
}
