<script setup>
import AccountsPage from '../pages/AccountsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <AccountsPage v-bind="app" />
</template>
