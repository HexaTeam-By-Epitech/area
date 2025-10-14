<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

interface Placeholder {
  key: string;
  description: string;
  example: string;
}

interface Props {
  modelValue: string;
  placeholders: Placeholder[];
  placeholder?: string;
  required?: boolean;
  type?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  required: false,
  type: 'text',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const showDropdown = ref(false);
const selectedIndex = ref(0);
const cursorPosition = ref(0);

// Valid placeholder keys set
const validPlaceholderKeys = computed(() =>
  new Set(props.placeholders.map(p => p.key))
);

// Render HTML with colored placeholders
const renderHTML = computed(() => {
  const value = props.modelValue || '';
  if (!value) return '';

  const parts: string[] = [];
  let lastIndex = 0;

  const regex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(value)) !== null) {
    // Add text before the placeholder
    if (match.index > lastIndex) {
      parts.push(escapeHtml(value.substring(lastIndex, match.index)));
    }

    // Add the placeholder with styling
    const placeholderKey = match[1];
    const isValid = validPlaceholderKeys.value.has(placeholderKey);
    const className = isValid ? 'placeholder-valid' : 'placeholder-invalid';
    parts.push(`<span class="${className}">${escapeHtml(match[0])}</span>`);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < value.length) {
    parts.push(escapeHtml(value.substring(lastIndex)));
  }

  return parts.join('');
});

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Detect when user types {{ to show autocomplete
const searchQuery = computed(() => {
  const value = props.modelValue || '';
  const beforeCursor = value.substring(0, cursorPosition.value);

  const lastOpenBrace = beforeCursor.lastIndexOf('{{');
  if (lastOpenBrace === -1) return null;

  const afterBrace = value.substring(lastOpenBrace);
  const closingBrace = afterBrace.indexOf('}}');

  if (closingBrace === -1 || lastOpenBrace + closingBrace >= cursorPosition.value) {
    const query = beforeCursor.substring(lastOpenBrace + 2);
    return { query, position: lastOpenBrace };
  }

  return null;
});

// Filter placeholders based on search query
const filteredPlaceholders = computed(() => {
  if (!searchQuery.value) return [];

  const query = searchQuery.value.query.toLowerCase();

  return props.placeholders.filter(p =>
    p.key.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query)
  );
});

// Show dropdown when we have a search query and filtered results
watch([searchQuery, filteredPlaceholders], ([query, filtered]) => {
  const wasShown = showDropdown.value;
  showDropdown.value = query !== null && filtered.length > 0;

  if (showDropdown.value) {
    selectedIndex.value = 0;
  }

  // When dropdown closes, force re-render to validate placeholders
  if (wasShown && !showDropdown.value && editorRef.value) {
    const savedPos = cursorPosition.value;
    editorRef.value.innerHTML = renderHTML.value;
    nextTick(() => {
      restoreCursorPosition(savedPos);
    });
  }
});

// Get plain text from contenteditable
function getPlainText(): string {
  if (!editorRef.value) return '';
  return editorRef.value.innerText || '';
}

// Save cursor position
function saveCursorPosition() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  if (editorRef.value) {
    preCaretRange.selectNodeContents(editorRef.value);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    cursorPosition.value = preCaretRange.toString().length;
  }
}

// Restore cursor position
function restoreCursorPosition(pos: number) {
  if (!editorRef.value) return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  let currentPos = 0;
  let found = false;

  function traverse(node: Node) {
    if (found) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const textLength = textNode.length;

      if (currentPos + textLength >= pos) {
        range.setStart(textNode, pos - currentPos);
        range.collapse(true);
        found = true;
        return;
      }

      currentPos += textLength;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (found) return;
      }
    }
  }

  traverse(editorRef.value);

  if (found) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Handle input changes
function handleInput() {
  const newValue = getPlainText();
  const oldValue = props.modelValue;

  emit('update:modelValue', newValue);
  saveCursorPosition();

  // Force immediate re-render to fix styling issues
  // This ensures placeholders are re-validated and text outside placeholders doesn't inherit colors
  nextTick(() => {
    if (editorRef.value && props.modelValue === newValue) {
      const savedPos = cursorPosition.value;
      const newHTML = renderHTML.value;

      // Always update HTML to ensure proper styling
      if (newHTML !== editorRef.value.innerHTML) {
        editorRef.value.innerHTML = newHTML;
        nextTick(() => {
          restoreCursorPosition(savedPos);
        });
      }
    }
  });
}

// Update editor content when modelValue changes or placeholders change
watch([() => props.modelValue, () => props.placeholders], ([newValue]) => {
  if (!editorRef.value) return;

  const currentHTML = editorRef.value.innerHTML;
  const newHTML = renderHTML.value || `<span class="placeholder-text">${props.placeholder}</span>`;

  // Always update if HTML content is different (not just text)
  if (currentHTML !== newHTML && newValue) {
    const savedPos = cursorPosition.value;
    editorRef.value.innerHTML = newHTML;
    nextTick(() => {
      restoreCursorPosition(savedPos);
    });
  } else if (!newValue && editorRef.value.innerText) {
    editorRef.value.innerHTML = '';
  }
}, { immediate: true });

// Insert placeholder at cursor position
function insertPlaceholder(placeholder: Placeholder) {
  if (!searchQuery.value) return;

  const value = props.modelValue || '';
  const { position } = searchQuery.value;

  const before = value.substring(0, position);
  const after = value.substring(cursorPosition.value);

  // Add a space after placeholder to ensure we exit the colored span
  const newValue = `${before}{{${placeholder.key}}} ${after}`;
  emit('update:modelValue', newValue);

  showDropdown.value = false;

  setTimeout(() => {
    // Position cursor after the placeholder and the space
    const newPos = before.length + placeholder.key.length + 5;
    cursorPosition.value = newPos;

    if (editorRef.value) {
      // Force complete re-render to ensure proper styling
      editorRef.value.innerHTML = renderHTML.value;
      nextTick(() => {
        restoreCursorPosition(newPos);
        editorRef.value?.focus();
      });
    }
  }, 10);
}

// Scroll dropdown item into view
function scrollSelectedIntoView() {
  nextTick(() => {
    const dropdown = editorRef.value?.parentElement?.querySelector('.placeholder-dropdown');
    if (!dropdown) return;

    const selectedItem = dropdown.children[selectedIndex.value];
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  });
}

// Handle keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (!showDropdown.value) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredPlaceholders.value.length - 1);
    scrollSelectedIntoView();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    scrollSelectedIntoView();
  } else if (event.key === 'Tab' || event.key === 'Enter') {
    if (filteredPlaceholders.value[selectedIndex.value]) {
      event.preventDefault();
      insertPlaceholder(filteredPlaceholders.value[selectedIndex.value]);
    }
  } else if (event.key === 'Escape') {
    showDropdown.value = false;
  }
}

// Handle click outside to close dropdown
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (editorRef.value && !editorRef.value.contains(target) &&
      !target.closest('.placeholder-dropdown')) {
    showDropdown.value = false;
  }
}

// Handle focus to remove placeholder text
function handleFocus() {
  if (!props.modelValue && editorRef.value) {
    editorRef.value.innerHTML = '';
  }
}

// Handle blur to restore placeholder text
function handleBlur() {
  if (!props.modelValue && editorRef.value) {
    editorRef.value.innerHTML = `<span class="placeholder-text">${props.placeholder}</span>`;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (editorRef.value && !props.modelValue) {
    editorRef.value.innerHTML = `<span class="placeholder-text">${props.placeholder}</span>`;
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="placeholder-input-wrapper">
    <div
      ref="editorRef"
      :id="id"
      contenteditable="true"
      @input="handleInput"
      @keydown="handleKeydown"
      @keyup="saveCursorPosition"
      @mouseup="saveCursorPosition"
      @focus="handleFocus"
      @blur="handleBlur"
      :class="['config-input', { empty: !modelValue }]"
      :data-placeholder="placeholder"
    ></div>

    <div v-if="showDropdown" class="placeholder-dropdown">
      <div
        v-for="(ph, index) in filteredPlaceholders"
        :key="ph.key"
        :class="['placeholder-item', { selected: index === selectedIndex }]"
        @click="insertPlaceholder(ph)"
        @mouseenter="selectedIndex = index"
      >
        <div class="placeholder-key">{{ ph.key }}</div>
        <div class="placeholder-description">{{ ph.description }}</div>
        <div class="placeholder-example">Example: {{ ph.example }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder-input-wrapper {
  position: relative;
  width: 100%;
}

.config-input {
  position: relative;
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--text-secondary);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
  min-height: 2.75rem;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.config-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.config-input::-webkit-scrollbar {
  width: 6px;
}

.config-input::-webkit-scrollbar-thumb {
  background: var(--text-secondary);
  border-radius: 3px;
}

:deep(.placeholder-valid) {
  color: #4CAF50;
  font-weight: 600;
  background-color: rgba(76, 175, 80, 0.2);
  padding: 0.1rem 0.25rem;
  border-radius: 0.25rem;
}

:deep(.placeholder-invalid) {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.15);
  padding: 0.1rem 0.25rem;
  border-radius: 0.25rem;
  text-decoration: line-through;
  border: 1px solid rgba(255, 107, 107, 0.3);
  font-weight: 500;
}

:deep(.placeholder-text) {
  color: var(--text-secondary);
  opacity: 0.6;
  pointer-events: none;
}

.placeholder-dropdown {
  position: absolute;
  bottom: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background-color: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.placeholder-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}

.placeholder-item:last-child {
  border-bottom: none;
}

.placeholder-item:hover,
.placeholder-item.selected {
  background-color: rgba(76, 175, 80, 0.2);
}

.placeholder-key {
  font-weight: 600;
  font-family: monospace;
  color: #4CAF50;
  margin-bottom: 0.15rem;
  font-size: 0.85rem;
}

.placeholder-description {
  font-size: 0.8rem;
  color: var(--text-primary);
  margin-bottom: 0.15rem;
}

.placeholder-example {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Scrollbar styling */
.placeholder-dropdown::-webkit-scrollbar {
  width: 6px;
}

.placeholder-dropdown::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.placeholder-dropdown::-webkit-scrollbar-thumb {
  background: var(--text-secondary);
  border-radius: 3px;
}

.placeholder-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
