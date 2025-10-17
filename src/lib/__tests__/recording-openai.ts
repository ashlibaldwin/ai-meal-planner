/* eslint-disable @typescript-eslint/no-require-imports */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

type ChatArgs = {
  model: string
  messages: any[]
  temperature?: number
  top_p?: number
  max_tokens?: number
}

function hashArgs(args: ChatArgs): string {
  const canon = JSON.stringify({
    model: args.model,
    messages: args.messages,
    temperature: args.temperature ?? 0,
    top_p: args.top_p ?? 1,
    max_tokens: args.max_tokens ?? null
  })
  return crypto.createHash('sha256').update(canon).digest('hex').slice(0, 16)
}

export default class RecordingOpenAI {
  private mode: 'record' | 'replay'
  private fixturesDir: string
  private real: any | null
  constructor() {
    this.mode =
      process.env.OPENAI_RECORD_MODE === 'record' ? 'record' : 'replay'
    this.fixturesDir = path.resolve(
      process.cwd(),
      'src/lib/__tests__/fixtures/llm'
    )
    if (this.mode === 'record') {
      const OpenAI = require('openai').default
      this.real = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
    if (!fs.existsSync(this.fixturesDir))
      fs.mkdirSync(this.fixturesDir, { recursive: true })
  }
  chat = {
    completions: {
      create: async (args: ChatArgs) => {
        const key = hashArgs(args)
        const file = path.join(this.fixturesDir, `${key}.json`)
        if (this.mode === 'replay') {
          if (!fs.existsSync(file))
            throw new Error(
              `No fixture for key ${key}. Run with OPENAI_RECORD_MODE=record to capture.`
            )
          const content = fs.readFileSync(file, 'utf-8')
          return JSON.parse(content)
        } else {
          const resp = await this.real.chat.completions.create(args)
          fs.writeFileSync(file, JSON.stringify(resp))
          return resp
        }
      }
    }
  }
}
