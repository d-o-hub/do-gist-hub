<template>
  <div class="websocket-component">
    <div v-if="connected" class="status">Connected</div>
    <div v-else class="status">Disconnected</div>
    <div class="messages">
      <div v-for="msg in messages" :key="msg.id">{{ msg.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Subject, Subscription } from 'rxjs';

const connected = ref(false);
const messages = ref<any[]>([]);

let ws: WebSocket | null = null;
let subscription: Subscription | null = null;
const messageSubject$ = new Subject<any>();

onMounted(() => {
  // Create WebSocket connection
  ws = new WebSocket('wss://example.com/socket');
  
  ws.onopen = () => {
    connected.value = true;
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    messageSubject$.next(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  // Subscribe to RxJS observable
  subscription = messageSubject$.subscribe((msg) => {
    messages.value.push(msg);
  });
});

onUnmounted(() => {
  // Clean up WebSocket connection
  if (ws) {
    ws.close();
    ws = null;
  }

  // Unsubscribe from RxJS observable
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }

  // Complete the subject
  messageSubject$.complete();
});
</script>
