<template>
    <div class="container py-4">
        <h1 class="mb-4">Email Logs</h1>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-danger">
            Error loading emails: {{ error }}
        </div>

        <!-- Accordion -->
        <div v-else class="accordion accordion-flush shadow-sm" id="accordionEmails">
            <div v-for="email in emails" :key="email.UUID" class="accordion-item">
                <!-- HEADER -->
                <!-- Note: Changed ID to 'heading-' to avoid conflict with content -->
                <h2 class="accordion-header" :id="'heading-' + email.UUID">
                    <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse"
                        :data-bs-target="'#collapse-' + email.UUID" aria-expanded="false"
                        :aria-controls="'collapse-' + email.UUID">

                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <!-- Left Side: Subject -->
                            <span class="text-truncate me-3" style="max-width: 60%;">
                                {{ email.UUID }} - {{ email.subject }}
                            </span>

                            <!-- Right Side: Meta Data Badges -->
                            <div class="d-flex gap-2 align-items-center">
                                <!-- Type Badge -->
                                <span :class="['badge', getTypeBadgeClass(email.email_type)]">
                                    {{ email.email_type }}
                                </span>

                                <!-- Status Badge -->
                                <span :class="['badge', getStatusBadgeClass(email.status)]">
                                    {{ email.status }}
                                </span>

                                <!-- Date -->
                                <small class="text-muted ms-2 d-none d-md-block me-3">
                                    {{ formatDate(email.sent_at || email.created_at) }}
                                </small>
                            </div>
                        </div>
                    </button>
                </h2>

                <!-- BODY / COLLAPSE -->
                <!-- Note: Changed ID to 'collapse-' and removed 'show' class to ensure it starts closed -->
                <div :id="'collapse-' + email.UUID" class="accordion-collapse collapse"
                    data-bs-parent="#accordionEmails">
                    <div class="accordion-body">

                        <!-- Meta Data Grid -->
                        <div class="row g-3 mb-4 p-2  border rounded">
                            <div class="col-md-6">
                                <small class="text-muted d-block">Email UUID</small>
                                <code class="small text-break">{{ email.UUID }}</code>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted d-block">Account UUID</small>
                                <code class="small text-break">{{ email.account_UUID }}</code>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Created At</small>
                                <span class="small">{{ formatDate(email.created_at) }}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Sent At</small>
                                <span class="small">{{ email.sent_at ? formatDate(email.sent_at) : 'Not sent yet'
                                }}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Status</small>
                                <span :class="['badge', getStatusBadgeClass(email.status)]">{{ email.status }}</span>
                            </div>
                        </div>

                        <!-- Content Tabs -->
                        <ul class="nav nav-tabs mb-3" id="emailTab-{{ email.UUID }}" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="html-tab-{{ email.UUID }}" data-bs-toggle="tab"
                                    :data-bs-target="'#html-pane-' + email.UUID" type="button" role="tab">HTML
                                    Preview</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="text-tab-{{ email.UUID }}" data-bs-toggle="tab"
                                    :data-bs-target="'#text-pane-' + email.UUID" type="button" role="tab">Raw
                                    Text</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="data-tab-{{ email.UUID }}" data-bs-toggle="tab"
                                    :data-bs-target="'#data-pane-' + email.UUID" type="button" role="tab">Data
                                    JSON</button>
                            </li>
                        </ul>

                        <div class="tab-content" id="myTabContent-{{ email.UUID }}">
                            <!-- HTML Preview Pane -->
                            <div class="tab-pane fade show active" :id="'html-pane-' + email.UUID" role="tabpanel">
                                <div class="card  border">
                                    <div class="card-body p-0 overflow-auto" style="max-height: 600px;">
                                        <!-- Fixed height iframe to prevent vanishing/layout shifts -->
                                        <iframe :srcdoc="email.html" class="w-100 border-0"
                                            style="height: 600px; min-height: 400px;"></iframe>
                                    </div>
                                </div>
                            </div>

                            <!-- Raw Text Pane -->
                            <div class="tab-pane fade" :id="'text-pane-' + email.UUID" role="tabpanel">
                                <pre class=" p-3 border rounded"
                                    style="white-space: pre-wrap;">{{ email.text || 'No text content available' }}</pre>
                            </div>

                            <!-- Data JSON Pane -->
                            <div class="tab-pane fade" :id="'data-pane-' + email.UUID" role="tabpanel">
                                <pre class="bg-dark text-light p-3 border rounded">{{ formatData(email.data) }}</pre>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { Email, timestamped } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

definePageMeta({
    middleware: 'auth',
});

const adminStore = useAdminStore(); // Even if unused, keeping your logic
const authStore = useAuthStore();

// Helper to format timestamps (Assumes seconds, if ms remove * 1000)
const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
};

// Helper to parse data string if it's JSON
const formatData = (dataString: string) => {
    try {
        const parsed = JSON.parse(dataString);
        return JSON.stringify(parsed, null, 2);
    } catch (e) {
        return dataString;
    }
};

// Styling Helpers
const getTypeBadgeClass = (type: string) => {
    switch (type) {
        case 'VERIFICATION': return 'bg-primary';
        case 'PASSWORD_RESET': return 'bg-danger';
        default: return 'bg-secondary';
    }
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'SENT': return 'bg-success';
        case 'PENDING': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
};

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);
const emails = computed(() => adminStore.emails);
</script>

<style scoped>
/* Ensure iframes are handled well */
iframe {
    display: block;
}
</style>