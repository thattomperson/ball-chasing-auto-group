import { NowRequest, NowResponse } from '@now/node'
import fetch from 'node-fetch'
import querystring from 'querystring'

const formatDate = (d: Date): string => `${d.getFullYear()}-${("00" + (d.getMonth() + 1)).slice(-2)}-${d.getDate()}`

const after = (d: Date): string => `${formatDate(d)}T00:00:00+00:00`
const before = (d: Date): string => `${formatDate(d)}T23:59:59+00:00`

export default async (req: NowRequest, res: NowResponse) => {

  let d = new Date()
  if (typeof req.query.date === 'string') {
    d = new Date(req.query.date)
  }

  const query = {
    'player-name': 'Steam:76561198026169069',
    'replay-date-after': after(d),
    'replay-date-before': before(d),
  }

  const qs = querystring.stringify(query)

  const body = await fetch(`https://ballchasing.com/api/replays/6c60499f-3462-46e9-91bd-6bfe618477f0`, {
    headers: {
      'Authorization': process.env.BALLCHASING_API,
    }
  })
  .then(r => r.json())
  // .then(({list}) => )

  res.json(body)
}
