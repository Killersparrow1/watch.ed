import { renderToString } from 'react-dom/server'
import { renderNotes } from './src/lib/render-notes'

const samples: string[] = [
  `loved it
<iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/6dZmnyIxUUyJZvqVPTEDcJ?utm_source=generator&si=1197b31914c04924" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
great movie`,
  'this is **bold** and *italic* and ~~strike~~ and `code`',
  'watch this https://media.giphy.com/media/abc/giphy.gif NOW',
  'plain text with 5* rating and 1. list and # not heading',
  '**bold _with_ stuff** and **more**',
  '`**nested**` inside code',
  'no formatting at all asdfasdf',
  '',
  'only an asterisk * end',
]

for (const s of samples) {
  try {
    const html = renderToString(renderNotes(s))
    console.log('OK  ->', html.slice(0, 120))
  } catch (e) {
    console.log('ERR ->', s.slice(0, 60), '\n     ', e)
  }
}