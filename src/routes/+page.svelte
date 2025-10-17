<script lang="ts">
  import { onMount } from 'svelte'
  import type { MealPreferences } from '$lib/openai.js'
  import type { MealPlan, ChatMessage } from '$lib/types.js'
  import ChatInterface from '$lib/components/ChatInterface.svelte'
  import MealPlanComponent from '$lib/components/MealPlan.svelte'
  import GroceryList from '$lib/components/GroceryList.svelte'
  import ErrorMessage from '$lib/components/ErrorMessage.svelte'

  const defaultPreferences: MealPreferences = {
    dietaryRestrictions: [],
    cuisinePreferences: [],
    mealTypes: ['dinner'],
    cookingTime: '30-60 minutes',
    difficulty: 'easy',
    servingSize: 4,
    specialRequests: ''
  }

  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content:
      "Hi! I'm your AI meal planner. Tell me about your dietary preferences, favorite cuisines, cooking time, and any other requirements. I'll create a personalized weekly meal plan for you!",
    timestamp: new Date()
  }

  let preferences: MealPreferences = { ...defaultPreferences }
  let mealPlan: MealPlan | null = null
  let loading = false
  let error = ''
  let chatInput = ''
  let chatMessages: ChatMessage[] = [welcomeMessage]
  let isGenerating = false
  let expandedMeals: Set<string> = new Set()
  let retryCount = 0
  const maxRetries = 3
  let chatContainer: HTMLElement | undefined
  let hasUserSentMessage = false

  onMount(() => {
    preferences = { ...defaultPreferences }
    mealPlan = null
    hasUserSentMessage = false
    chatMessages = [welcomeMessage]
  })

  function createChatMessage(
    role: 'user' | 'assistant',
    content: string
  ): ChatMessage {
    return {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    }
  }

  function addMessage(message: ChatMessage) {
    chatMessages = [...chatMessages, message]
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }

  function handleError(errorMessage: string) {
    error = errorMessage
    const shouldRetry =
      retryCount < maxRetries &&
      (errorMessage.includes('Server error') ||
        errorMessage.includes('Failed to process') ||
        errorMessage.includes('timeout'))

    const content = shouldRetry
      ? `Sorry, I encountered an error: ${errorMessage}. Would you like to try again?`
      : `Sorry, I encountered an error: ${errorMessage}`

    addMessage(createChatMessage('assistant', content))

    if (shouldRetry) {
      retryCount++
    }
  }

  $: placeholderText = hasUserSentMessage
    ? ''
    : 'Tell me about your preferences...'

  $: if (chatMessages.length > 0) {
    setTimeout(scrollToBottom, 50)
  }

  async function sendMessage() {
    if (!chatInput.trim() || isGenerating) return

    const userMessage = createChatMessage('user', chatInput.trim())
    addMessage(userMessage)
    hasUserSentMessage = true
    const currentInput = chatInput
    chatInput = ''
    isGenerating = true

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      retryCount = 0
      error = ''

      if (data.preferences) {
        preferences = data.preferences
      }

      addMessage(
        createChatMessage(
          'assistant',
          data.response ||
            'I understand your preferences. Let me create a meal plan for you!'
        )
      )

      if (data.mealPlan) {
        mealPlan = data.mealPlan
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      handleError(errorMessage)
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
        headers: { 'Content-Type': 'application/json' },
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
      addMessage(
        createChatMessage(
          'assistant',
          `I've updated your meal plan based on your request: "${modificationRequest}"`
        )
      )
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
    expandedMeals = expandedMeals.has(mealId)
      ? new Set([...expandedMeals].filter((id) => id !== mealId))
      : new Set([...expandedMeals, mealId])
  }

  function printMealPlan() {
    if (mealPlan) {
      expandedMeals = new Set(mealPlan.meals.map((meal) => meal.id))
      setTimeout(() => window.print(), 100)
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
</svelte:head>

<div class="min-h-screen bg-white">
  <div class="max-w-4xl mx-auto px-6 py-12">
    <!-- Header -->
    <div
      class="text-center mb-12 print:text-center print:mb-8 print:border-b-2 print:border-black print:pb-4"
    >
      <h1 class="text-3xl font-semibold text-gray-900 mb-3">AI Meal Planner</h1>
      <p class="text-gray-600">
        Chat with me to plan your perfect week of meals
      </p>
    </div>

    <div class="space-y-8">
      <ChatInterface
        {chatMessages}
        {isGenerating}
        bind:chatInput
        {placeholderText}
        onSendMessage={sendMessage}
        onKeyPress={handleKeyPress}
      />

      <MealPlanComponent
        {mealPlan}
        {isGenerating}
        {expandedMeals}
        onToggleMealExpansion={toggleMealExpansion}
        onPrintMealPlan={printMealPlan}
      />

      <GroceryList {mealPlan} />
    </div>

    <ErrorMessage {error} onClear={clearError} />
  </div>
</div>
