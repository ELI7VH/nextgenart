export const micIn = async () => {
  const audioContext = new AudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const source = audioContext.createMediaStreamSource(stream)
  audioContext.resume()

  const analyser = audioContext.createAnalyser()

  const data = new Float32Array(analyser.frequencyBinCount)
  const tdData = new Uint8Array(analyser.frequencyBinCount)

  source.connect(analyser)

  const updateFloatFrequencyData = () => {
    analyser.getFloatFrequencyData(data)
  }

  const updateByteTimeDomainData = () => {
    analyser.getByteTimeDomainData(tdData)
  }

  return {
    analyser,
    audioContext,
    updateFloatFrequencyData,
    updateByteTimeDomainData,
    data,
    tdData,
  }
}
