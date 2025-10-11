<script lang="ts">
  import { tick } from 'svelte'
  import type { ChatMessage } from '../types.js'

  interface Props {
    chatMessages?: ChatMessage[]
    isGenerating?: boolean
    chatInput?: string
    placeholderText?: string
    onSendMessage: () => void
    onKeyPress: (event: KeyboardEvent) => void
  }

  let {
    chatMessages = [],
    isGenerating = false,
    chatInput = $bindable(''),
    placeholderText = '',
    onSendMessage,
    onKeyPress
  }: Props = $props()

  let chatContainer: HTMLElement
  let userScrolledUp = false
  let lastLen = 0

  function onScroll() {
    const { scrollTop, scrollHeight, clientHeight } = chatContainer
    userScrolledUp = scrollHeight - (scrollTop + clientHeight) > 40 // 40px leeway
  }

  $effect(() => {
    if (chatMessages.length !== lastLen) {
      lastLen = chatMessages.length
      if (!userScrolledUp) {
        tick().then(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight
        })
      }
    }
  })
</script>

<div class="card h-[500px] flex flex-col no-print">
  <!-- Chat Messages -->
  <div
    bind:this={chatContainer}
    onscroll={onScroll}
    class="flex-1 overflow-y-auto p-6 space-y-4"
  >
    {#each chatMessages as message, index}
      <div
        class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}"
      >
        <div
          class="chat-bubble {message.role === 'user'
            ? 'chat-user'
            : 'chat-assistant'}"
        >
          <p>{message.content}</p>
          <p class="text-xs opacity-60 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    {/each}

    {#if isGenerating}
      <div class="flex justify-start">
        <div class="chat-bubble chat-assistant">
          <div class="flex items-center space-x-2">
            <div
              class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"
            ></div>
            <span>Planning your meals...</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Chat Input -->
  <div class="border-t border-gray-100 p-4">
    <div class="flex space-x-3">
      <input
        type="text"
        class="input-field flex-1"
        placeholder={placeholderText}
        bind:value={chatInput}
        onkeydown={onKeyPress}
        disabled={isGenerating}
      />
      <button
        class="btn-primary"
        onclick={onSendMessage}
        disabled={isGenerating || !chatInput.trim()}
      >
        Send
      </button>
    </div>
  </div>
</div>
