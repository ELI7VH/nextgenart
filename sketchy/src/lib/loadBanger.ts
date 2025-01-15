import { Banger, getWav } from '@dank-inc/banger'

export const loadBanger = async (url: string) => {
  const wav = await getWav(url)
  if (!wav) {
    console.error('Failed to load wav')
    return null
  }

  return new Banger({
    arrayBuffer: wav,
    name: 'banger',
    volume: 1,
    drift: 1000,
    onFail: () => console.error('Failed to load wav'),
    onLoaded: () => {
      console.log('wav loaded')
    },
  })
}
