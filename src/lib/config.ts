export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  nodeEnv: process.env.NODE_ENV || 'development'
}

// Validate required environment variables
export function validateEnvironment() {
  const errors: string[] = []

  if (!config.openaiApiKey) {
    errors.push('OPENAI_API_KEY is required')
  }

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required')
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }
}

// Validate environment in production
if (config.nodeEnv === 'production') {
  validateEnvironment()
}
