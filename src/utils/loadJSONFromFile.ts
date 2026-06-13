import { csvParse } from 'd3-dsv'

export function loadJSONFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv'
    input.multiple = true
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) {
        reject(new Error('No file selected'))
        return
      }
      const readers: Promise<any>[] = []
      for (let i = 0; i < files.length; i++) {
        readers.push(
          new Promise((res, rej) => {
            const reader = new FileReader()
            const file = files[i]!
            reader.onload = (event) => {
              try {
                const content = event.target?.result as string
                const isCSV = file.name.endsWith('.csv')
                const parsed = isCSV ? csvParse(content) : JSON.parse(content)
                res(parsed)
              } catch (err) {
                rej(err)
              }
            }
            reader.onerror = (err) => {
              rej(err)
            }
            reader.readAsText(file)
          }),
        )
      }
      Promise.all(readers)
        .then((results) => {
          resolve(results.length === 1 ? results[0] : results)
        })
        .catch(reject)
    }
    input.click()
  })
}
