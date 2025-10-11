<script lang="ts">
  import { onMount } from 'svelte'
  import type { MealPreferences } from '$lib/openai.js'
  import ChatInterface from '$lib/components/ChatInterface.svelte'
  import MealPlanComponent from '$lib/components/MealPlan.svelte'
  import GroceryList from '$lib/components/GroceryList.svelte'
  import ErrorMessage from '$lib/components/ErrorMessage.svelte'

  interface Recipe {
    id: string
    name: string
    description: string
    ingredients: string[]
    instructions: string[]
    prepTime: number
    cookTime: number
    servings: number
    cuisine: string
    dietaryTags: string[]
    difficulty: string
  }

  interface MealPlan {
    id: string
    preferences: string
    groceryList: string[]
    meals: {
      id: string
      dayOfWeek: string
      mealType: string
      recipe: Recipe
    }[]
  }

  interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }

  let preferences: MealPreferences = {
    dietaryRestrictions: [],
    cuisinePreferences: [],
    mealTypes: ['dinner'],
    cookingTime: '30-60 minutes',
    difficulty: 'easy',
    servingSize: 4,
    specialRequests: ''
  }

  let mealPlan: MealPlan | null = null
  let loading = false
  let error = ''
  let chatInput = ''
  let chatMessages: ChatMessage[] = []
  let isGenerating = false
  let expandedMeals: Set<string> = new Set()
  let retryCount = 0
  const maxRetries = 3
  let chatContainer: HTMLElement
  let hasUserSentMessage = false

  // Ensure a fresh session on page load/reload (no sticky state)
  onMount(() => {
    preferences = {
      dietaryRestrictions: [],
      cuisinePreferences: [],
      mealTypes: ['dinner'],
      cookingTime: '30-60 minutes',
      difficulty: 'easy',
      servingSize: 4,
      specialRequests: ''
    }
    mealPlan = null
    hasUserSentMessage = false
    chatMessages = [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hi! I'm your AI meal planner. Tell me about your dietary preferences, favorite cuisines, cooking time, and any other requirements. I'll create a personalized weekly meal plan for you!",
        timestamp: new Date()
      }
    ]
  })

  // Initialize with welcome message
  chatMessages = [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your AI meal planner. Tell me about your dietary preferences, favorite cuisines, cooking time, and any other requirements. I'll create a personalized weekly meal plan for you!",
      timestamp: new Date()
    }
  ]

  // Function to scroll to bottom of chat
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }

  // Reactive placeholder text
  $: placeholderText = hasUserSentMessage
    ? ''
    : 'Tell me about your preferences...'

  // Scroll when messages change
  $: if (chatMessages.length > 0) {
    setTimeout(scrollToBottom, 50)
  }

  async function sendMessage() {
    if (!chatInput.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    }

    chatMessages = [...chatMessages, userMessage]
    hasUserSentMessage = true
    const currentInput = chatInput
    chatInput = ''
    isGenerating = true

    try {
      // Parse user input to extract preferences
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences,
          userMessage: currentInput,
          currentMealPlanId: mealPlan?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      // Reset retry count on success
      retryCount = 0
      error = ''

      // Update preferences if provided
      if (data.preferences) {
        preferences = data.preferences
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          data.response ||
          'I understand your preferences. Let me create a meal plan for you!',
        timestamp: new Date()
      }

      chatMessages = [...chatMessages, assistantMessage]

      // Update meal plan if generated
      if (data.mealPlan) {
        mealPlan = data.mealPlan
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      error = errorMessage

      // Add retry option for certain errors
      const shouldRetry =
        retryCount < maxRetries &&
        (errorMessage.includes('Server error') ||
          errorMessage.includes('Failed to process') ||
          errorMessage.includes('timeout'))

      const errorContent = shouldRetry
        ? `Sorry, I encountered an error: ${errorMessage}. Would you like to try again?`
        : `Sorry, I encountered an error: ${errorMessage}`

      const errorMessageObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      chatMessages = [...chatMessages, errorMessageObj]

      if (shouldRetry) {
        retryCount++
      }
    } finally {
      isGenerating = false
    }
  }

  async function modifyMealPlan(modificationRequest: string) {
    if (!mealPlan || !modificationRequest.trim()) return

    loading = true
    error = ''

    try {
      const response = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences,
          modificationRequest: modificationRequest.trim(),
          currentMealPlanId: mealPlan.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to modify meal plan')
      }

      const data = await response.json()
      mealPlan = data.mealPlan

      // Add modification message
      const modificationMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: `I've updated your meal plan based on your request: "${modificationRequest}"`,
        timestamp: new Date()
      }
      chatMessages = [...chatMessages, modificationMessage]
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading = false
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function toggleMealExpansion(mealId: string) {
    if (expandedMeals.has(mealId)) {
      expandedMeals.delete(mealId)
    } else {
      expandedMeals.add(mealId)
    }
    expandedMeals = expandedMeals // Trigger reactivity
  }

  function printMealPlan() {
    // Expand all meals for printing
    if (mealPlan) {
      mealPlan.meals.forEach((meal) => {
        expandedMeals.add(meal.id)
      })
      expandedMeals = expandedMeals // Trigger reactivity

      // Wait for DOM to update, then print
      setTimeout(() => {
        window.print()
      }, 100)
    }
  }

  async function retryLastRequest() {
    if (chatMessages.length > 1) {
      const lastUserMessage = chatMessages[chatMessages.length - 2]
      if (lastUserMessage.role === 'user') {
        chatInput = lastUserMessage.content
        await sendMessage()
      }
    }
  }

  function clearError() {
    error = ''
    retryCount = 0
  }
</script>

<svelte:head>
  <title>AI Meal Planner</title>
  <meta
    name="description"
    content="Plan your weekly meals with AI assistance"
  />
  <style>
    @media print {
      body {
        background: white !important;
        color: black !important;
      }

      .no-print {
        display: none !important;
      }

      .print-header {
        text-align: center;
        margin-bottom: 2rem;
        border-bottom: 2px solid #000;
        padding-bottom: 1rem;
      }

      .print-section {
        page-break-inside: avoid;
        margin-bottom: 2rem;
      }

      .print-meal {
        page-break-inside: avoid;
        margin-bottom: 1.5rem;
        border: 1px solid #ccc;
        padding: 1rem;
      }

      .print-ingredients {
        columns: 2;
        column-gap: 1rem;
      }

      .print-instructions {
        margin-top: 1rem;
      }

      .print-grocery {
        columns: 3;
        column-gap: 1rem;
      }

      .print-grocery-item {
        break-inside: avoid;
        margin-bottom: 0.5rem;
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
  </style>
</svelte:head>

<div class="min-h-screen bg-white">
  <div class="max-w-4xl mx-auto px-6 py-12">
    <!-- Header -->
    <div class="text-center mb-12 print-header">
      <h1 class="text-3xl font-semibold text-gray-900 mb-3">AI Meal Planner</h1>
      <p class="text-gray-600">
        Chat with me to plan your perfect week of meals
      </p>
    </div>

    <div class="space-y-8">
      <!-- Chat Interface -->
      <ChatInterface
        {chatMessages}
        {isGenerating}
        bind:chatInput
        {placeholderText}
        onSendMessage={sendMessage}
        onKeyPress={handleKeyPress}
      />

      <!-- Weekly Meal Plan -->
      <MealPlanComponent
        {mealPlan}
        {isGenerating}
        {expandedMeals}
        onToggleMealExpansion={toggleMealExpansion}
        onPrintMealPlan={printMealPlan}
      />

      <!-- Grocery List -->
      <GroceryList {mealPlan} />
    </div>

    <!-- Error Message -->
    <ErrorMessage
      {error}
      {retryCount}
      {maxRetries}
      onRetry={retryLastRequest}
      onClear={clearError}
    />
  </div>
</div>
