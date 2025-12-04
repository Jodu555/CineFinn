<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
</script>

<template>
    <div>
        <h1>{{ error.statusCode }}</h1>
        <p>{{ error.message }}</p>
        <NuxtLink to="/login">To login</NuxtLink>
    </div>
</template>