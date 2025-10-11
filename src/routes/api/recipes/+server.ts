import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}
